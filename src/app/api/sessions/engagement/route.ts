import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  liveClassId: z.string().uuid(),
  engagement: z.record(
    z.string(),
    z.object({
      name: z.string(),
      speakingMs: z.number().int().min(0),
    })
  ),
});

/**
 * Teachers (only) write engagement metrics to the latest session_recording
 * for this live class. Captured client-side by the teacher's browser
 * during the session — one POST at session end. Used by the post-session
 * summary email + the parent's recording playback card.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { liveClassId, engagement } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: liveClass } = await supabase
    .from("live_classes")
    .select("teacher_id")
    .eq("id", liveClassId)
    .single();
  if (!liveClass || liveClass.teacher_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: recordings } = await admin
    .from("session_recordings")
    .select("id")
    .eq("live_class_id", liveClassId)
    .order("started_at", { ascending: false })
    .limit(1);
  const recordingId = recordings?.[0]?.id;
  if (!recordingId) {
    // No recording yet (egress not started). Stash on the live_class
    // would require a separate column; for now just acknowledge and skip.
    return NextResponse.json({ ok: true, attached: false });
  }

  await admin
    .from("session_recordings")
    .update({ engagement_json: engagement })
    .eq("id", recordingId);

  return NextResponse.json({ ok: true, attached: true });
}
