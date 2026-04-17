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
    <div
      className="relative overflow-hidden rounded-xl border border-slate-200"
      style={{ height: "600px" }}
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
