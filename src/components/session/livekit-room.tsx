"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import { Track, RoomEvent, type DataPublishOptions } from "livekit-client";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import { ModeratedChat } from "./moderated-chat";
import { Hand, Users, Loader2, Presentation } from "lucide-react";
import { Whiteboard } from "./whiteboard";

type LiveKitRoomEmbedProps = {
  liveClassId: string;
  userRole: "parent" | "teacher";
  onClose?: () => void;
  actingAsLearnerId?: string;
};

type TokenResponse = {
  token: string;
  url: string;
  roomName: string;
};

// ─── Waiting room overlay for learners ───
function WaitingRoom({ liveClassId, onAdmitted }: { liveClassId: string; onAdmitted: () => void }) {
  const [status, setStatus] = useState<"checking" | "waiting" | "admitted">("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // Check if teacher is present
        const res = await fetch(`/api/sessions/teacher-present?liveClassId=${liveClassId}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.teacherPresent) {
          // Teacher is here — self-admit and proceed
          await fetch("/api/sessions/admission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liveClassId }),
          });
          setStatus("admitted");
          onAdmitted();
          return;
        }

        setStatus("waiting");
      } catch {
        if (!cancelled) setStatus("waiting");
      }
    }

    check();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      if (!cancelled) check();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveClassId, onAdmitted]);

  if (status === "checking") {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <Loader2 className="size-8 animate-spin text-[var(--ev-blue)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col items-center justify-center gap-4 rounded-xl border border-[var(--ev-amber)]/20 bg-[var(--ev-amber)]/5 p-8 text-center">
      <Users className="size-12 text-[var(--ev-amber)]" />
      <h3 className="text-lg font-semibold text-slate-900">Salle d&apos;attente</h3>
      <p className="max-w-xs text-sm text-slate-600">
        Le professeur n&apos;est pas encore arrivé. Vous serez automatiquement admis dès qu&apos;il rejoint la session.
      </p>
      <div className="mt-2">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--ev-amber)]/20 border-t-[var(--ev-amber)]" />
      </div>
    </div>
  );
}

// ─── Teacher waiting list panel ───
function TeacherWaitingList({ liveClassId }: { liveClassId: string }) {
  const [waiting, setWaiting] = useState<Array<{ user_id: string; display_name: string }>>([]);
  const room = useRoomContext();

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sessions/admission?liveClassId=${liveClassId}`);
      const data = await res.json();
      const admittedIds = new Set((data.admissions ?? []).map((a: Record<string, unknown>) => a.user_id as string));

      // Get current participants in the room
      const remoteParticipants = room.remoteParticipants;
      const waitingParticipants: Array<{ user_id: string; display_name: string }> = [];

      remoteParticipants.forEach((p) => {
        if (!admittedIds.has(p.identity)) {
          waitingParticipants.push({
            user_id: p.identity,
            display_name: p.name || p.identity,
          });
        }
      });

      setWaiting(waitingParticipants);
    }

    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [liveClassId, room]);

  async function admit(userId: string) {
    await fetch("/api/sessions/admission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveClassId, userId }),
    });
    setWaiting((prev) => prev.filter((w) => w.user_id !== userId));
  }

  if (waiting.length === 0) return null;

  return (
    <div className="absolute left-4 top-4 z-20 max-w-xs rounded-lg border border-[var(--ev-amber)]/30 bg-white/95 p-3 shadow-lg backdrop-blur">
      <h4 className="mb-2 text-xs font-semibold text-[var(--ev-amber)]">
        En attente ({waiting.length})
      </h4>
      <div className="space-y-1.5">
        {waiting.map((w) => (
          <div key={w.user_id} className="flex items-center justify-between gap-3">
            <span className="truncate text-xs text-slate-700">{w.display_name}</span>
            <button
              onClick={() => admit(w.user_id)}
              className="shrink-0 rounded bg-[var(--ev-blue)] px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[var(--ev-blue-light)]"
            >
              Admettre
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Raise hand button using LiveKit data messages ───
function RaiseHandButton() {
  const room = useRoomContext();
  const [raised, setRaised] = useState(false);

  // Listen for raise hand messages from other participants
  useEffect(() => {
    const handler = () => {
      // Handled by tile overlay or could trigger toast
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const toggleRaiseHand = useCallback(() => {
    const newState = !raised;
    setRaised(newState);
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "raise_hand", raised: newState, timestamp: Date.now() })
    );
    room.localParticipant.publishData(payload, { reliable: true } as DataPublishOptions);
  }, [raised, room]);

  return (
    <button
      onClick={toggleRaiseHand}
      className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        raised
          ? "bg-[var(--ev-amber)] text-white"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
      title={raised ? "Baisser la main" : "Lever la main"}
    >
      <Hand className={`size-4 ${raised ? "fill-current" : ""}`} />
      {raised ? "Main levée" : "Lever la main"}
    </button>
  );
}

// ─── Participant tile with raise hand indicator ───


// ─── Main embed ───
export function LiveKitRoomEmbed({
  liveClassId,
  userRole,
  onClose,
  actingAsLearnerId,
}: LiveKitRoomEmbedProps) {
  const t = useTranslations("session");
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inWaitingRoom, setInWaitingRoom] = useState(userRole === "parent");
  const teacherAdmittedRef = useRef(false);

  // Teacher auto-admits themselves on mount
  useEffect(() => {
    if (userRole === "teacher") {
      fetch("/api/sessions/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId }),
      }).catch(() => {});
      setInWaitingRoom(false);
      teacherAdmittedRef.current = true;
    }
  }, [userRole, liveClassId]);

  useEffect(() => {
    if (inWaitingRoom) return; // Don't connect until admitted
    let cancelled = false;

    async function connect() {
      try {
        const tokenRes = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liveClassId, learnerId: actingAsLearnerId }),
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
  }, [liveClassId, userRole, actingAsLearnerId, inWaitingRoom]);

  // Teacher leave → stop egress
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
      } catch {}
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

  if (inWaitingRoom) {
    return (
      <WaitingRoom
        liveClassId={liveClassId}
        onAdmitted={() => setInWaitingRoom(false)}
      />
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
        <RoomLayout
          liveClassId={liveClassId}
          userRole={userRole}
          actingAsLearnerId={actingAsLearnerId}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// ─── Room layout with chat, waiting list, and raise hand ───
function RoomLayout({
  liveClassId,
  userRole,
  actingAsLearnerId,
}: {
  liveClassId: string;
  userRole: "parent" | "teacher";
  actingAsLearnerId?: string;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {userRole === "teacher" && <TeacherWaitingList liveClassId={liveClassId} />}
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
              <ModeratedChat
                liveClassId={liveClassId}
                actingAsLearnerId={actingAsLearnerId}
              />
            </div>
          </aside>
        ) : null}

        {/* Whiteboard overlay: covers the video+chat row only, leaving the
            control bar below accessible so the user can toggle it off. */}
        {whiteboardOpen && (
          <div className="absolute inset-0 z-30">
            <Whiteboard onClose={() => setWhiteboardOpen(false)} />
          </div>
        )}
      </div>

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
        <RaiseHandButton />
        <button
          type="button"
          onClick={() => setWhiteboardOpen((v) => !v)}
          className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
            whiteboardOpen
              ? "bg-[var(--ev-green)] text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title="Tableau blanc"
        >
          <Presentation className="size-4" />
          Tableau
        </button>
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
