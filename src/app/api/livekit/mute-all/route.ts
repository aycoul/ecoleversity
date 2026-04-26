import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoomName } from "@/lib/video/livekit";

const schema = z.object({
  liveClassId: z.string().uuid(),
  // "mute"   = stop talking right now (they can re-enable themselves)
  // "lock"   = mute AND revoke canPublish for MICROPHONE; participants
  //            can't unmute until the teacher unlocks
  // "unlock" = re-grant MICROPHONE publish permission; mics are NOT
  //            auto-unmuted (students opt back in)
  action: z.enum(["mute", "lock", "unlock"]).default("mute"),
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
  const { liveClassId, action } = parsed.data;

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
    let permissionsChanged = 0;
    for (const p of participants) {
      // Skip the teacher themselves.
      if (p.identity === user.id) continue;

      if (action === "mute" || action === "lock") {
        for (const track of p.tracks) {
          if (track.source === TrackSource.MICROPHONE && !track.muted) {
            await client.mutePublishedTrack(roomName, p.identity, track.sid, true);
            muted++;
          }
        }
      }

      if (action === "lock" || action === "unlock") {
        // Update the participant's permissions. CAMERA + SCREEN_SHARE
        // stay allowed; only MICROPHONE is restricted.
        const sources =
          action === "lock"
            ? [TrackSource.CAMERA, TrackSource.SCREEN_SHARE]
            : [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE];
        await client.updateParticipant(roomName, p.identity, undefined, {
          canPublish: true,
          canPublishSources: sources,
          canSubscribe: true,
        });
        permissionsChanged++;
      }
    }
    return NextResponse.json({ ok: true, muted, permissionsChanged, action });
  } catch (err) {
    console.error("[mute-all] error:", err);
    return NextResponse.json(
      { error: "Erreur" },
      { status: 500 }
    );
  }
}
