import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signRecordingUrl } from "@/lib/video/r2-signing";

const paramsSchema = z.object({
  liveClassId: z.string().uuid(),
});

/**
 * Auth-gated presigned URL for a class recording. Lands on 302 redirect
 * to a short-lived R2 URL. Accessible to:
 *   - the teacher who taught the class
 *   - any parent whose learner was enrolled in the class
 *   - admins
 *
 * Query params:
 *   - recordingId (optional): pick a specific recording row. If absent,
 *     returns the most recent completed one. Classes can have multiple
 *     egresses (tech hiccup → rejoin → second egress).
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ liveClassId: string }> }
) {
  try {
    const { liveClassId } = paramsSchema.parse(await ctx.params);
    const url = new URL(request.url);
    const recordingId = url.searchParams.get("recordingId");

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Resolve role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
    }
    const role = profile.role as "parent" | "teacher" | "admin";

    const admin = createAdminClient();

    // Fetch the class (teacher_id needed for authorization)
    const { data: liveClass } = await admin
      .from("live_classes")
      .select("id, teacher_id")
      .eq("id", liveClassId)
      .maybeSingle();
    if (!liveClass) {
      return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
    }

    // Authorization
    let authorized = role === "admin";
    if (!authorized && role === "teacher" && liveClass.teacher_id === user.id) {
      authorized = true;
    }
    if (!authorized && role === "parent") {
      // Any learner of this parent must be enrolled in the class
      const { data: enrolled } = await admin
        .from("enrollments")
        .select("learner_id")
        .eq("live_class_id", liveClassId);
      const learnerIds = (enrolled ?? [])
        .map((e) => e.learner_id as string | null)
        .filter((v): v is string => !!v);
      if (learnerIds.length > 0) {
        const { count } = await admin
          .from("learner_profiles")
          .select("id", { count: "exact", head: true })
          .in("id", learnerIds)
          .eq("parent_id", user.id);
        if (count && count > 0) authorized = true;
      }
    }
    if (!authorized) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Pick recording row
    let query = admin
      .from("session_recordings")
      .select("id, r2_key, status")
      .eq("live_class_id", liveClassId)
      .eq("status", "completed");
    if (recordingId) {
      const asInt = Number.parseInt(recordingId, 10);
      if (Number.isFinite(asInt)) {
        query = query.eq("id", asInt);
      }
    }
    const { data: recordings } = await query
      .order("ended_at", { ascending: false })
      .limit(1);
    const recording = recordings?.[0];
    if (!recording?.r2_key) {
      return NextResponse.json(
        { error: "Enregistrement indisponible" },
        { status: 404 }
      );
    }

    const signedUrl = await signRecordingUrl(recording.r2_key as string, 600);
    return NextResponse.redirect(signedUrl, 302);
  } catch (err) {
    const e = err as Error;
    console.error("[recording/play]", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
