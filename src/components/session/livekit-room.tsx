"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";

type LiveKitRoomEmbedProps = {
  liveClassId: string;
  userRole: "parent" | "teacher";
  onClose?: () => void;
};

type TokenResponse = {
  token: string;
  url: string;
  roomName: string;
};

export function LiveKitRoomEmbed({
  liveClassId,
  userRole,
  onClose,
}: LiveKitRoomEmbedProps) {
  const t = useTranslations("session");
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const tokenRes = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liveClassId }),
        });

        if (!tokenRes.ok) {
          const data = await tokenRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Échec de la connexion");
        }

        const tokenData: TokenResponse = await tokenRes.json();
        if (cancelled) return;
        setConnection(tokenData);

        if (userRole === "teacher") {
          fetch("/api/livekit/start-recording", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liveClassId }),
          }).catch((err) => {
            console.error("Failed to start recording:", err);
          });
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
      }
    }

    connect();
    return () => {
      cancelled = true;
    };
  }, [liveClassId, userRole]);

  // When the teacher leaves (or the page unmounts), stop the egress so
  // LiveKit Cloud isn't billed for a recording after the class ends.
  // Fires beacon-style so the request survives a page-close.
  useEffect(() => {
    if (userRole !== "teacher") return;
    const stop = () => {
      const body = JSON.stringify({ liveClassId });
      const blob = new Blob([body], { type: "application/json" });
      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon("/api/livekit/stop-recording", blob);
        } else {
          fetch("/api/livekit/stop-recording", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Best-effort only — egress also auto-stops when the room empties.
      }
    };

    const handlePageHide = () => stop();
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      if (userRole === "teacher") stop();
    };
  }, [liveClassId, userRole]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-semibold text-red-700">{t("connectError")}</p>
        <p className="text-xs text-red-600">{error}</p>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--ev-green)]/20 border-t-[var(--ev-blue)]" />
      </div>
    );
  }

  return (
    // Fill most of the viewport below the back-bar + give the chat panel
    // room to slide in on the right. overflow-hidden was clipping chat
    // when the user opened it — 720px min-height is tall enough for chat
    // stacked below video on narrow screens, and the flex layout lets
    // LiveKit's grid + side panel share horizontal space on wider ones.
    <div
      className="relative rounded-xl border border-slate-200"
      style={{ height: "min(80vh, 720px)", minHeight: "480px" }}
      data-lk-theme="default"
    >
      <LiveKitRoom
        token={connection.token}
        serverUrl={connection.url}
        connect
        video
        audio
        onDisconnected={onClose}
        style={{ height: "100%" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
