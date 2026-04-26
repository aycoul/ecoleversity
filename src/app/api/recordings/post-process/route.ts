import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranscriptReviewMode } from "@/lib/platform-config";
import { signRecordingUrl } from "@/lib/video/r2-signing";
import { transcribeRecording, TranscribeError } from "@/lib/ai/transcribe";
import { buildTwinPayload } from "@/lib/ai/twin-payload";
import { extractLessonStructure } from "@/lib/ai/lesson-extract";
import { buildSessionSummary } from "@/lib/ai/session-summary";
import { chunkSegments } from "@/lib/ai/twin-chunking";
import { embedBatch } from "@/lib/ai/embeddings";
import { aggregateTeachingStyle } from "@/lib/ai/twin-style-aggregator";
import { sendSessionSummaryEmail } from "@/lib/notifications/session-summary-email";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";

/**
 * Post-processing pipeline. Called once per recording after LiveKit egress
 * completes (via the webhook) and also invocable on-demand for backfill.
 *
 * Contract (POST):
 *   body: { recordingId: string }
 *   auth: requires X-Post-Process-Secret header matching env POST_PROCESS_SECRET
 *         (so we can leave it unauthenticated but not open to the internet)
 *
 * Pipeline:
 *   1. Load recording + live_class + teacher profile + enrolled learners+parents.
 *   2. Gate on teacher.ai_services_enabled → mark 'skipped_teacher' and exit.
 *   3. Mark ai_status='processing' to make the job idempotent.
 *   4. Whisper transcribe the R2 mp4 (verbose_json with segments).
 *   5. Claude: build twin-ready training payload → insert ai_training_content row.
 *   6. Claude: build parent-facing summary → store on session_recordings.
 *   7. For each enrolled parent with ai_services_enabled → Resend email.
 *   8. Mark ai_status='done' + processed_at + parent_email_sent_at.
 *
 * On any unexpected error: ai_status='failed' with ai_status_error populated,
 * so the admin UI can surface it and a retry button can re-drive the same row.
 */

const POST_PROCESS_SECRET_HEADER = "X-Post-Process-Secret";

type RecordingRow = {
  id: string;
  live_class_id: string;
  r2_key: string;
  r2_url: string | null;
  duration_seconds: number | null;
  ai_status: string;
};

type LiveClassRow = {
  id: string;
  teacher_id: string;
  subject: string;
  grade_level: string;
  title: string | null;
  scheduled_at: string;
  duration_minutes: number;
};

type TeacherProfile = {
  id: string;
  display_name: string | null;
  ai_services_enabled: boolean;
};

type ParentRecipient = {
  parentId: string;
  parentName: string;
  parentEmail: string;
  learnerFirstName: string;
};

export async function POST(req: NextRequest) {
  const secret = process.env.POST_PROCESS_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "POST_PROCESS_SECRET not configured on server" },
      { status: 500 }
    );
  }
  const provided = req.headers.get(POST_PROCESS_SECRET_HEADER) ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { recordingId?: string };
  const recordingId = body.recordingId;
  if (!recordingId) {
    return NextResponse.json({ error: "recordingId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: recording, error: recErr } = await admin
    .from("session_recordings")
    .select("id, live_class_id, r2_key, r2_url, duration_seconds, ai_status")
    .eq("id", recordingId)
    .maybeSingle<RecordingRow>();
  if (recErr || !recording) {
    console.error("[post-process] recording not found:", recErr?.message);
    return NextResponse.json({ error: "recording_not_found" }, { status: 404 });
  }

  // Idempotency: if a previous call already finished, short-circuit.
  if (recording.ai_status === "done") {
    return NextResponse.json({ ok: true, status: "already_done" });
  }

  const { data: liveClass } = await admin
    .from("live_classes")
    .select("id, teacher_id, subject, grade_level, title, scheduled_at, duration_minutes")
    .eq("id", recording.live_class_id)
    .maybeSingle<LiveClassRow>();
  if (!liveClass) {
    await markFailed(admin, recordingId, "live_class not found");
    return NextResponse.json({ error: "live_class not found" }, { status: 404 });
  }

  const { data: teacher } = await admin
    .from("profiles")
    .select("id, display_name, ai_services_enabled")
    .eq("id", liveClass.teacher_id)
    .maybeSingle<TeacherProfile>();
  if (!teacher) {
    await markFailed(admin, recordingId, "teacher profile not found");
    return NextResponse.json({ error: "teacher not found" }, { status: 404 });
  }

  if (!teacher.ai_services_enabled) {
    await admin
      .from("session_recordings")
      .update({
        ai_status: "done",
        ai_status_error: "skipped: teacher has ai_services_enabled=false",
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", recordingId);
    return NextResponse.json({ ok: true, status: "skipped_teacher" });
  }

  // Mark processing so a concurrent call exits fast.
  await admin
    .from("session_recordings")
    .update({ ai_status: "processing", ai_status_error: null })
    .eq("id", recordingId);

  try {
    // ── Whisper transcription ───────────────────────────────────────────
    const signedUrl = await signRecordingUrl(recording.r2_key, 60 * 10);
    const whisper = await transcribeRecording(signedUrl);

    // ── Resolve or create twin row for this teacher+subject ────────────
    const twinId = await ensureTwin(admin, {
      teacherId: teacher.id,
      subject: liveClass.subject,
      gradeLevel: liveClass.grade_level,
    });

    // ── Structured twin-training payload ───────────────────────────────
    const payload = await buildTwinPayload({
      segments: whisper.segments,
      language: whisper.language,
      durationSeconds: whisper.durationSeconds,
      subject: liveClass.subject,
      gradeLevel: liveClass.grade_level,
    });

    // Lesson-structure extraction — phases, exercise bank, explanation bank.
    // Powers the future session-twin (scale teachers who sell out).
    const lesson = await extractLessonStructure(payload);

    // Lesson-structure extraction — phases, exercise bank, explanation bank.
    // Powers the future session-twin (scale teachers who sell out).
    const { data: trainRow, error: trainInsertErr } = await admin
      .from("ai_training_content")
      .insert({
        twin_id: twinId,
        source_type: "live_recording",
        source_id: String(recording.id),
        transcription: whisper.text,
        training_payload: payload,
        extracted_topics: payload.topics,
        lesson_phases: lesson.phases,
        exercises_extracted: lesson.exercises,
        explanations_extracted: lesson.explanations,
        language: whisper.language,
        duration_seconds: whisper.durationSeconds,
        segment_count: payload.segments.length,
        payload_version: 1,
        processing_status: "ready",
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();
    if (trainInsertErr || !trainRow) {
      throw new Error(
        `ai_training_content insert failed: ${trainInsertErr?.message ?? "null"}`
      );
    }

    // Chunk segments + embed into the RAG index. Cheap at ~€0.02/1M tokens;
    // the invocation API reads this table at conversation time via pgvector.
    const chunks = chunkSegments(payload);
    if (chunks.length > 0) {
      const embeddings = await embedBatch(chunks.map((c) => c.text));
      const rows = chunks.map((c, i) => ({
        twin_id: twinId,
        training_content_id: trainRow.id,
        chunk_index: c.chunkIndex,
        speaker: c.speaker,
        text: c.text,
        start_seconds: c.startSeconds,
        end_seconds: c.endSeconds,
        topics: c.topics,
        embedding: embeddings[i]
          ? `[${embeddings[i].join(",")}]`
          : null,
      }));
      const { error: chunkErr } = await admin
        .from("twin_knowledge_chunks")
        .insert(rows);
      if (chunkErr) {
        // Non-fatal: we still have the transcript + summary. Log + continue.
        console.error("twin_knowledge_chunks insert failed:", chunkErr.message);
      }
    }

    // Re-aggregate the teacher's style profile across all sessions so the
    // twin's system prompt stays current.
    await aggregateTeachingStyle(admin, twinId);

    // ── Parent-facing summary ──────────────────────────────────────────
    const summary = await buildSessionSummary(whisper.text);

    // Review mode controls who has to approve the summary before parent
    // emails go out. 'auto' preserves the original behavior (immediate
    // send); 'teacher_review' and 'admin_review' park the recording in
    // an awaiting state for /api/recordings/[id]/approve-summary.
    const reviewMode = await getTranscriptReviewMode();
    const reviewStatus =
      reviewMode === "teacher_review"
        ? "awaiting_teacher"
        : reviewMode === "admin_review"
          ? "awaiting_admin"
          : "auto_sent";

    await admin
      .from("session_recordings")
      .update({
        summary,
        ai_status: "done",
        ai_status_error: null,
        ai_processed_at: new Date().toISOString(),
        summary_review_status: reviewStatus,
      })
      .eq("id", recordingId);

    if (reviewMode !== "auto") {
      // Park: a reviewer will fire the email via the approve endpoint.
      return NextResponse.json({
        ok: true,
        status: "awaiting_review",
        reviewMode,
        transcriptChars: whisper.text.length,
        segments: payload.segments.length,
        twinId,
      });
    }

    // ── Parent emails (gated per-parent on ai_services_enabled) ────────
    const parents = await loadParentRecipients(admin, liveClass.id);
    const subjectLabel =
      SUBJECT_LABELS[liveClass.subject as Subject] ?? liveClass.subject;
    const recordingSignedUrl = await signRecordingUrl(recording.r2_key, 60 * 60 * 24 * 7);

    let sent = 0;
    for (const p of parents) {
      const result = await sendSessionSummaryEmail({
        parentEmail: p.parentEmail,
        parentName: p.parentName,
        learnerFirstName: p.learnerFirstName,
        teacherName: teacher.display_name ?? "Votre enseignant",
        subjectLabel,
        sessionDate: new Date(liveClass.scheduled_at),
        summary,
        recordingUrl: recordingSignedUrl,
      });
      if (result.sent) sent++;
    }
    if (sent > 0) {
      await admin
        .from("session_recordings")
        .update({ parent_email_sent_at: new Date().toISOString() })
        .eq("id", recordingId);
    }

    return NextResponse.json({
      ok: true,
      status: "done",
      transcriptChars: whisper.text.length,
      segments: payload.segments.length,
      emailsSent: sent,
      twinId,
    });
  } catch (err) {
    const message = toErrorMessage(err);
    console.error("[post-process] failed:", message);
    await markFailed(admin, recordingId, message);
    return NextResponse.json({ error: "post_process_failed" }, { status: 500 });
  }
}

function toErrorMessage(err: unknown): string {
  if (err instanceof TranscribeError) return `${err.kind}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  recordingId: string,
  message: string
): Promise<void> {
  await admin
    .from("session_recordings")
    .update({
      ai_status: "failed",
      ai_status_error: message.slice(0, 500),
      ai_processed_at: new Date().toISOString(),
    })
    .eq("id", recordingId);
}

async function ensureTwin(
  admin: ReturnType<typeof createAdminClient>,
  opts: { teacherId: string; subject: string; gradeLevel: string }
): Promise<string> {
  const { data: existing } = await admin
    .from("ai_teacher_twins")
    .select("id")
    .eq("teacher_id", opts.teacherId)
    .eq("subject", opts.subject)
    .eq("grade_level", opts.gradeLevel)
    .maybeSingle<{ id: string }>();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("ai_teacher_twins")
    .insert({
      teacher_id: opts.teacherId,
      subject: opts.subject,
      grade_level: opts.gradeLevel,
      maturity_level: "level_0",
      total_recordings_processed: 0,
      teaching_style_profile: {},
      is_active: false,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) {
    throw new Error(`failed to create twin: ${error?.message ?? "unknown"}`);
  }
  return created.id;
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

  // Auth emails live in auth.users (read-only from API via admin).
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
      parentId,
      parentName: profile.displayName ?? "Parent",
      parentEmail: email,
      learnerFirstName: (learner.first_name as string) ?? "votre enfant",
    });
  }
  return out;
}
