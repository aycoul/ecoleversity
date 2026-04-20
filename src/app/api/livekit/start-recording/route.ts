import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoomName } from "@/lib/video/livekit";

const schema = z.object({
  liveClassId: z.string().uuid(),
});

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

    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("id, teacher_id")
      .eq("id", liveClassId)
      .single();

    if (!liveClass || liveClass.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Seul l'enseignant peut démarrer l'enregistrement" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("session_recordings")
      .select("id, egress_id, status")
      .eq("live_class_id", liveClassId)
      .in("status", ["starting", "active"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        egressId: existing.egress_id,
        status: existing.status,
        alreadyRecording: true,
      });
    }

    const livekitUrl = process.env.LIVEKIT_URL!;
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret);

    const timestamp = Date.now();
    const year = new Date().getUTCFullYear();
    const month = String(new Date().getUTCMonth() + 1).padStart(2, "0");
    const r2Key = `recordings/${year}/${month}/${liveClassId}-${timestamp}.mp4`;

    const s3Output = new S3Upload({
      accessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secret: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
      region: "auto",
      forcePathStyle: true,
    });

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: r2Key,
      output: { case: "s3", value: s3Output },
    });

    const egressInfo = await egressClient.startRoomCompositeEgress(
      getRoomName(liveClassId),
      { file: fileOutput },
      { layout: "speaker" }
    );

    const { error: insertError } = await admin
      .from("session_recordings")
      .insert({
        live_class_id: liveClassId,
        egress_id: egressInfo.egressId,
        r2_key: r2Key,
        started_at: new Date().toISOString(),
        status: "starting",
      });

    if (insertError) {
      console.error("Failed to persist session_recording:", insertError);
    }

    return NextResponse.json({
      egressId: egressInfo.egressId,
      r2Key,
      status: "starting",
    });
  } catch (err) {
    const e = err as Error;
    console.error("LiveKit start-recording error:", e.name, e.message, e.stack);
    // LiveKit throws this when no one has joined — the room materializes on
    // first participant connect. Surface a teacher-friendly 409 instead of
    // a generic 500.
    if (e.message?.includes("room does not exist")) {
      return NextResponse.json(
        {
          error: "no_room",
          message:
            "La salle n'est pas encore ouverte. Démarrez l'enregistrement après avoir rejoint le cours.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
