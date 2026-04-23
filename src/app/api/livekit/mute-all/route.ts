import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomServiceClient } from "livekit-server-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoomName } from "@/lib/video/livekit";

const schema = z.object({
  liveClassId: z.string().uuid(),
});

/**
 * Teacher-only endpoint. Force-mutes every non-teacher participant's
 * microphone in the LiveKit room. Participants can unmute themselves
 * again afterwards — this is one-shot "hush the class," not a
 * permanent gag. LiveKit's canPublishSources on the token still
 * includes MICROPHONE, so individual unmute works.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { liveClassId } = parsed.data;

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

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const host = process.env.LIVEKIT_URL?.replace(/^wss?:\/\//, "https://");
  if (!apiKey || !apiSecret || !host) {
    return NextResponse.json(
      { error: "LiveKit non configuré" },
      { status: 500 }
    );
  }

  const client = new RoomServiceClient(host, apiKey, apiSecret);
  const roomName = getRoomName(liveClassId);

  try {
    const participants = await client.listParticipants(roomName);
    let muted = 0;
    for (const p of participants) {
      // Skip the teacher themselves.
      if (p.identity === user.id) continue;
      for (const track of p.tracks) {
        if (track.source === 1 /* MICROPHONE */ && !track.muted) {
          await client.mutePublishedTrack(roomName, p.identity, track.sid, true);
          muted++;
        }
      }
    }
    return NextResponse.json({ ok: true, muted });
  } catch (err) {
    console.error("[mute-all] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
