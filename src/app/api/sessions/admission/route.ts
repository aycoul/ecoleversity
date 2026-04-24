import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const admitSchema = z.object({
  liveClassId: z.string().uuid(),
  // If omitted the current caller admits THEMSELVES. Else the caller
  // (teacher) admits someone by LiveKit identity. Parents acting-as-
  // learner pass their learner UUID as livekitIdentity so the admission
  // row's user_id matches the actual LiveKit participant identity
  // (otherwise TeacherWaitingList and other code that joins admissions
  // to LiveKit participants never finds a match for admitted kids).
  userId: z.string().uuid().optional(),
  livekitIdentity: z.string().uuid().nullable().optional(),
});

/** POST /api/sessions/admission — admit a learner (or self) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = admitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch class to verify teacher
    const { data: liveClass } = await admin
      .from("live_classes")
      .select("teacher_id")
      .eq("id", parsed.data.liveClassId)
      .single();

    if (!liveClass) {
      return NextResponse.json(
        { error: "Cours introuvable" },
        { status: 404 }
      );
    }

    const isTeacher = liveClass.teacher_id === user.id;
    // targetUserId is what we INSERT as the admission row's user_id.
    // Priority: explicit livekitIdentity (when parent is acting-as-learner
    // and wants the admission keyed on the learner) > explicit userId
    // (teacher admitting someone else) > caller's own auth UUID (default).
    //
    // For parents admitting themselves, we verify the livekitIdentity
    // belongs to one of their learners so a malicious client can't pass
    // someone else's UUID.
    let targetUserId = parsed.data.userId ?? user.id;
    if (parsed.data.livekitIdentity && parsed.data.livekitIdentity !== user.id) {
      // Parent self-admitting as one of their learners.
      const { data: learner } = await admin
        .from("learner_profiles")
        .select("id")
        .eq("id", parsed.data.livekitIdentity)
        .eq("parent_id", user.id)
        .maybeSingle();
      if (learner) {
        targetUserId = parsed.data.livekitIdentity;
      } else if (!isTeacher) {
        // Not their learner and not the teacher — reject.
        return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      } else {
        // Teacher admitting by learnerId — allowed.
        targetUserId = parsed.data.livekitIdentity;
      }
    }

    // Only teachers can admit OTHER auth users (via userId). Self-admission
    // with a learnerId is already verified above.
    if (
      parsed.data.userId &&
      parsed.data.userId !== user.id &&
      !isTeacher
    ) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 403 }
      );
    }

    // Upsert admission
    const { data, error } = await admin
      .from("session_admissions")
      .upsert(
        {
          live_class_id: parsed.data.liveClassId,
          user_id: targetUserId,
          admitted_at: new Date().toISOString(),
        },
        { onConflict: "live_class_id, user_id" }
      )
      .select("admitted_at")
      .single();

    if (error) {
      console.error("Admission error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'admission" },
        { status: 500 }
      );
    }

    return NextResponse.json({ admittedAt: data.admitted_at });
  } catch (err) {
    console.error("Admission error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

/** GET /api/sessions/admission?liveClassId=<uuid> — list admissions */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const liveClassId = searchParams.get("liveClassId");

  if (!liveClassId) {
    return NextResponse.json(
      { error: "liveClassId requis" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: admissions } = await admin
    .from("session_admissions")
    .select("user_id, admitted_at, profiles!inner(display_name)")
    .eq("live_class_id", liveClassId);

  return NextResponse.json({ admissions: admissions ?? [] });
}
