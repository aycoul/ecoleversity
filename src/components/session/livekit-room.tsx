"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  Chat,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
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

  // Teacher leave → stop egress so we don't bill for a phantom recording.
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
        // Best-effort; egress auto-stops when the room empties anyway.
      }
    };

    const handlePageHide = () => stop();
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      stop();
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
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-black"
      style={{ height: "min(82vh, 760px)", minHeight: "520px" }}
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
        <RoomLayout />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/**
 * Custom room layout — explicit grid + chat panel so chat can't be hidden
 * by VideoConference's opaque internal CSS. Chat visibility is driven by
 * local state and wired to the ControlBar's chat toggle via the standard
 * LayoutContext that ControlBar reads from.
 */
function RoomLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  // Camera + screen share tile refs for GridLayout
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Video + chat row — flex so chat panel gets guaranteed space */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <GridLayout tracks={tracks} style={{ height: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        </div>

        {chatOpen ? (
          <aside
            className="flex w-80 flex-col border-l border-white/10 bg-[var(--lk-bg,#111)] sm:w-96"
            style={{ minWidth: "288px" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-sm font-medium text-white">
              <span>Discussion</span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fermer la discussion"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat style={{ height: "100%" }} />
            </div>
          </aside>
        ) : null}
      </div>

      {/* Control bar pinned at the bottom. We hide the built-in chat toggle
          and render our own so it wires into our local chatOpen state. */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-[var(--lk-bg,#111)] px-2 py-2">
        <ControlBar
          variation="verbose"
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            chat: false,
            leave: true,
          }}
        />
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className={`lk-button rounded-md px-3 py-2 text-sm font-medium ${
            chatOpen
              ? "bg-white text-slate-900"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          aria-pressed={chatOpen}
        >
          {chatOpen ? "Fermer le chat" : "Ouvrir le chat"}
        </button>
      </div>
    </div>
  );
}
