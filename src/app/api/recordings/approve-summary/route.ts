import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signRecordingUrl } from "@/lib/video/r2-signing";
import { sendSessionSummaryEmail } from "@/lib/notifications/session-summary-email";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";

/**
 * POST /api/recordings/approve-summary
 *
 * Reviewer-driven completion of the summary email send. The reviewer is
 * either the teacher of the class (when transcript_review_mode is
 * 'teacher_review') or an admin (when 'admin_review'). Body carries
 * recordingId + an optional edited summary.
 *
 * The endpoint:
 *   1. Resolves the reviewer's role and verifies they're entitled to
 *      flip THIS recording (teacher must own the underlying class).
 *   2. Optionally writes a corrected summary onto the row.
 *   3. Fans out parent emails (same logic as the auto path) and stamps
 *      summary_review_status = 'sent'.
 *
 * Routing note: this lives under /api/recordings/approve-summary rather
 * than /api/recordings/[recordingId]/approve-summary because the parent
 * directory already declares a `[liveClassId]` dynamic segment for /play
 * — Next.js disallows two different param names at the same depth.
 */

const bodySchema = z.object({
  recordingId: z.coerce.number().int().positive(),
  summary: z.string().trim().min(20).max(8000).optional(),
});

type Recording = {
  id: number;
  live_class_id: string;
  r2_key: string;
  summary: string | null;
  summary_review_status: string;
  ai_status: string;
};

type ParentRecipient = {
  parentName: string;
  parentEmail: string;
  learnerFirstName: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (profile?.role as string | null) ?? null;
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { recordingId, summary: editedSummary } = parsed.data;

    const admin = createAdminClient();

    const { data: recording } = await admin
      .from("session_recordings")
      .select("id, live_class_id, r2_key, summary, summary_review_status, ai_status")
      .eq("id", recordingId)
      .maybeSingle<Recording>();
    if (!recording) {
      return NextResponse.json({ error: "Enregistrement introuvable" }, { status: 404 });
    }

    if (recording.summary_review_status === "sent" || recording.summary_review_status === "auto_sent") {
      return NextResponse.json({ ok: true, status: "already_sent" });
    }

    if (role === "teacher" && recording.summary_review_status !== "awaiting_teacher") {
      return NextResponse.json(
        { error: "Cet enregistrement n'attend pas votre validation" },
        { status: 409 }
      );
    }
    if (role === "admin" && recording.summary_review_status !== "awaiting_admin") {
      return NextResponse.json(
        { error: "Cet enregistrement n'attend pas une validation admin" },
        { status: 409 }
      );
    }

    const { data: liveClass } = await admin
      .from("live_classes")
      .select("id, teacher_id, subject, scheduled_at")
      .eq("id", recording.live_class_id)
      .maybeSingle();
    if (!liveClass) {
      return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
    }
    if (role === "teacher" && liveClass.teacher_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { data: teacher } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", liveClass.teacher_id)
      .maybeSingle();

    const finalSummary = editedSummary ?? recording.summary ?? "";
    if (!finalSummary || finalSummary.length < 20) {
      return NextResponse.json(
        { error: "Le résumé est vide ou trop court" },
        { status: 400 }
      );
    }

    await admin
      .from("session_recordings")
      .update({
        summary: finalSummary,
        summary_review_status:
          role === "teacher" ? "approved_by_teacher" : "approved_by_admin",
      })
      .eq("id", recording.id);

    const parents = await loadParentRecipients(admin, recording.live_class_id);
    const subjectLabel =
      SUBJECT_LABELS[liveClass.subject as Subject] ?? (liveClass.subject as string);
    const recordingSignedUrl = await signRecordingUrl(recording.r2_key, 60 * 60 * 24 * 7);

    let sent = 0;
    for (const p of parents) {
      const result = await sendSessionSummaryEmail({
        parentEmail: p.parentEmail,
        parentName: p.parentName,
        learnerFirstName: p.learnerFirstName,
        teacherName: teacher?.display_name ?? "Votre enseignant",
        subjectLabel,
        sessionDate: new Date(liveClass.scheduled_at as string),
        summary: finalSummary,
        recordingUrl: recordingSignedUrl,
      });
      if (result.sent) sent++;
    }

    await admin
      .from("session_recordings")
      .update({
        summary_review_status: "sent",
        parent_email_sent_at: new Date().toISOString(),
      })
      .eq("id", recording.id);

    return NextResponse.json({ ok: true, status: "sent", emailsSent: sent });
  } catch (err) {
    console.error("[approve-summary] threw:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

async function loadParentRecipients(
  admin: ReturnType<typeof createAdminClient>,
  liveClassId: string
): Promise<ParentRecipient[]> {
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("learner_id")
    .eq("live_class_id", liveClassId);
  const learnerIds = (enrollments ?? []).map((e) => e.learner_id as string);
  if (learnerIds.length === 0) return [];

  const { data: learners } = await admin
    .from("learner_profiles")
    .select("id, parent_id, first_name")
    .in("id", learnerIds);
  const parentIds = Array.from(
    new Set((learners ?? []).map((l) => l.parent_id as string))
  );
  if (parentIds.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, ai_services_enabled")
    .in("id", parentIds)
    .eq("ai_services_enabled", true);
  const eligible = new Map<string, { displayName: string | null }>();
  for (const p of profiles ?? []) {
    eligible.set(p.id as string, { displayName: (p.display_name as string) ?? null });
  }
  if (eligible.size === 0) return [];

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.email) emailByUserId.set(u.id, u.email);
  }

  const out: ParentRecipient[] = [];
  for (const learner of learners ?? []) {
    const parentId = learner.parent_id as string;
    const profile = eligible.get(parentId);
    const email = emailByUserId.get(parentId);
    if (!profile || !email) continue;
    out.push({
      parentName: profile.displayName ?? "Parent",
      parentEmail: email,
      learnerFirstName: (learner.first_name as string) ?? "votre enfant",
    });
  }
  return out;
}
