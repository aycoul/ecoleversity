import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EgressClient } from "livekit-server-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  liveClassId: z.string().uuid(),
});

/**
 * Stops the active egress for a live_class. Called when:
 *  - The teacher clicks "Quitter le cours" or closes the room
 *  - A LiveKit room_finished webhook fires (future)
 *
 * Idempotent — returns already_stopped if no active recording exists.
 * The egress_ended webhook is what actually finalizes the file_size /
 * r2_url / duration on session_recordings; this endpoint just signals
 * LiveKit to stop and updates status to "ending" locally.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      );
    }
    const { liveClassId } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Teacher-only — only the class owner can stop recording
    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("id, teacher_id")
      .eq("id", liveClassId)
      .maybeSingle();
    if (!liveClass || liveClass.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Seul l'enseignant peut arrêter l'enregistrement" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { data: recording } = await admin
      .from("session_recordings")
      .select("id, egress_id, status")
      .eq("live_class_id", liveClassId)
      .in("status", ["starting", "active"])
      .maybeSingle();

    if (!recording || !recording.egress_id) {
      return NextResponse.json({
        alreadyStopped: true,
      });
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!livekitUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit n'est pas configuré" },
        { status: 500 }
      );
    }

    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret);
    try {
      await egressClient.stopEgress(recording.egress_id as string);
    } catch (err) {
      // Egress might already be stopping/complete — log and continue.
      // Webhook fills in final file metadata regardless.
      console.warn(
        "[stop-recording] stopEgress failed:",
        (err as Error).message,
      );
    }

    // Final status flips to "completed"/"failed" when LiveKit Cloud posts
    // the egress_ended webhook to /api/livekit/webhook — that's where the
    // file URL + duration + byte size land. Don't touch status here so we
    // don't clash with the webhook's final update.

    return NextResponse.json({
      stopped: true,
      egressId: recording.egress_id,
    });
  } catch (err) {
    const e = err as Error;
    console.error("[stop-recording] error:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
