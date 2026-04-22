import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver, EgressStatus } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

/**
 * Fire the post-processing pipeline without blocking the webhook response.
 * Network + transcription can take 30–60s for a full class; LiveKit expects
 * us to ack in ~5s or it'll retry. The post-process route is idempotent
 * (checks ai_status) so retries are safe.
 */
function kickPostProcessing(recordingId: string): void {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ecoleversity.com";
  const secret = process.env.POST_PROCESS_SECRET;
  if (!secret) {
    console.warn("POST_PROCESS_SECRET not set — skipping post-process kick");
    return;
  }
  void fetch(`${baseUrl}/api/recordings/post-process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Post-Process-Secret": secret,
    },
    body: JSON.stringify({ recordingId }),
  }).catch((err) => {
    console.error("post-process kick failed:", err);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get("authorization") ?? "";

    const event = await receiver.receive(body, authHeader);

    if (event.event !== "egress_ended") {
      return NextResponse.json({ ok: true, skipped: event.event });
    }

    const egressInfo = event.egressInfo;
    if (!egressInfo) {
      return NextResponse.json({ ok: true, skipped: "no_egress_info" });
    }

    const admin = createAdminClient();

    const fileResult = egressInfo.fileResults?.[0];
    const r2Url = fileResult?.location ?? null;
    const fileSize = fileResult?.size != null ? Number(fileResult.size) : null;
    const durationNs =
      egressInfo.endedAt != null && egressInfo.startedAt != null
        ? Number(egressInfo.endedAt) - Number(egressInfo.startedAt)
        : null;
    const durationSeconds = durationNs
      ? Math.round(durationNs / 1_000_000_000)
      : null;

    const internalStatus =
      egressInfo.status === EgressStatus.EGRESS_COMPLETE
        ? "completed"
        : egressInfo.status === EgressStatus.EGRESS_FAILED
          ? "failed"
          : egressInfo.status === EgressStatus.EGRESS_ABORTED
            ? "aborted"
            : "completed";

    const { data: recording, error: updateError } = await admin
      .from("session_recordings")
      .update({
        r2_url: r2Url,
        file_size_bytes: fileSize,
        duration_seconds: durationSeconds,
        ended_at: egressInfo.endedAt
          ? new Date(Number(egressInfo.endedAt) / 1_000_000).toISOString()
          : new Date().toISOString(),
        status: internalStatus,
      })
      .eq("egress_id", egressInfo.egressId)
      .select("id, live_class_id")
      .single();

    if (updateError) {
      console.error("Failed to update session_recording:", updateError);
      return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 200 });
    }

    if (recording && internalStatus === "completed" && r2Url) {
      await admin
        .from("live_classes")
        .update({ recording_url: r2Url })
        .eq("id", recording.live_class_id);

      // Fire-and-forget the AI post-processing pipeline. We don't await it
      // so the webhook stays fast; LiveKit retries if we miss the ack window.
      // Errors inside post-process surface via session_recordings.ai_status.
      kickPostProcessing(recording.id);
    }

    return NextResponse.json({ ok: true, status: internalStatus });
  } catch (err) {
    console.error("LiveKit webhook error:", err);
    return NextResponse.json(
      { ok: false, error: "webhook_processing_failed" },
      { status: 200 }
    );
  }
}

