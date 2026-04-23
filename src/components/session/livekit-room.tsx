"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  useRoomContext,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track, RoomEvent, type DataPublishOptions, type RemoteParticipant } from "livekit-client";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ModeratedChat } from "./moderated-chat";
import { Hand, Users, Loader2, Presentation, LayoutGrid, Maximize2, Pin, PinOff } from "lucide-react";
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
  const t = useTranslations("session");
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
      <h3 className="text-lg font-semibold text-slate-900">{t("waitingRoomTitle")}</h3>
      <p className="max-w-xs text-sm text-slate-600">
        {t("waitingRoomSubtitle")}
      </p>
      <div className="mt-2">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--ev-amber)]/20 border-t-[var(--ev-amber)]" />
      </div>
    </div>
  );
}

// ─── Teacher waiting list panel ───
function TeacherWaitingList({ liveClassId }: { liveClassId: string }) {
  const t = useTranslations("session");
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
        {t("teacherWaitingListTitle", { count: waiting.length })}
      </h4>
      <div className="space-y-1.5">
        {waiting.map((w) => (
          <div key={w.user_id} className="flex items-center justify-between gap-3">
            <span className="truncate text-xs text-slate-700">{w.display_name}</span>
            <button
              onClick={() => admit(w.user_id)}
              className="shrink-0 rounded bg-[var(--ev-blue)] px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[var(--ev-blue-light)]"
            >
              {t("admitButton")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Raise-hand notification system ───────────────────────────────────
// Broadcasts: { type: "raise_hand", raised: boolean, timestamp: number }
// Receivers (everyone else) pop a toast when a new hand goes up and render
// a persistent amber pill listing currently-raised hands in the video area.
// ──────────────────────────────────────────────────────────────────────

type RaisedHand = { identity: string; name: string; raisedAt: number };

function RaiseHandButton() {
  const t = useTranslations("session");
  const room = useRoomContext();
  const [raised, setRaised] = useState(false);

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
      title={raised ? t("raiseHandTooltipRaised") : t("raiseHandTooltipLower")}
    >
      <Hand className={`size-4 ${raised ? "fill-current" : ""}`} />
      {raised ? t("handRaised") : t("raiseHand")}
    </button>
  );
}

function RaisedHandsPanel({ userRole }: { userRole: "parent" | "teacher" }) {
  const t = useTranslations("session");
  const room = useRoomContext();
  const [raised, setRaised] = useState<Record<string, RaisedHand>>({});

  useEffect(() => {
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (!participant) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type !== "raise_hand") return;

        const identity = participant.identity;
        const name = participant.name || identity;

        if (msg.raised) {
          setRaised((prev) => {
            if (prev[identity]) return prev; // already tracking, no duplicate toast
            // Teachers get a longer-lasting toast than students so they don't miss a raised hand.
            if (userRole === "teacher") {
              toast(t("handRaisedToastTitle", { name }), {
                description: t("handRaisedToastDesc"),
                duration: 6000,
              });
            } else {
              toast(t("handRaisedToastTitle", { name }), { duration: 3000 });
            }
            return { ...prev, [identity]: { identity, name, raisedAt: Date.now() } };
          });
        } else {
          setRaised((prev) => {
            if (!prev[identity]) return prev;
            const next = { ...prev };
            delete next[identity];
            return next;
          });
        }
      } catch {
        // ignore non-JSON / unrelated data packets
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, userRole]);

  // If a raised-hand participant disconnects, clear their entry so the pill
  // doesn't linger after they've left the room.
  useEffect(() => {
    const onDisconnect = (p: RemoteParticipant) => {
      setRaised((prev) => {
        if (!prev[p.identity]) return prev;
        const next = { ...prev };
        delete next[p.identity];
        return next;
      });
    };
    room.on(RoomEvent.ParticipantDisconnected, onDisconnect);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, onDisconnect);
    };
  }, [room]);

  const hands = Object.values(raised);
  if (hands.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <div className="pointer-events-auto flex max-w-[90%] items-center gap-2 rounded-full border border-[var(--ev-amber)]/30 bg-[var(--ev-amber)] px-4 py-2 text-sm font-semibold text-white shadow-lg">
        <Hand className="size-4 animate-pulse" />
        <span className="truncate">
          {hands.length === 1
            ? t("handRaisedPillOne", { name: hands[0].name })
            : t("handRaisedPillMany", {
                count: hands.length,
                names: hands.map((h) => h.name).join(", "),
              })}
        </span>
      </div>
    </div>
  );
}

// ─── Presentation / speaker layout ────────────────────────────────────
// Focus-and-thumbnail layout à la Zoom: one big tile + a strip of thumbnails.
// Auto-focus priority:
//   1. User-pinned participant (click any thumbnail)
//   2. Any active screen share
//   3. First remote participant
//   4. First track (fallback to local if nobody else is in the room yet)
// ──────────────────────────────────────────────────────────────────────

function getTrackKey(t: TrackReferenceOrPlaceholder): string {
  return `${t.participant.identity}:${t.source}`;
}

function PresentationLayout({
  tracks,
  pinnedKey,
  onPin,
}: {
  tracks: TrackReferenceOrPlaceholder[];
  pinnedKey: string | null;
  onPin: (key: string | null) => void;
}) {
  const t = useTranslations("session");

  const focused = useMemo(() => {
    if (pinnedKey) {
      const p = tracks.find((tr) => getTrackKey(tr) === pinnedKey);
      if (p) return p;
    }
    const screenShare = tracks.find(
      (tr) => tr.source === Track.Source.ScreenShare && tr.publication?.track
    );
    if (screenShare) return screenShare;
    const remote = tracks.find((tr) => !tr.participant.isLocal);
    return remote ?? tracks[0];
  }, [tracks, pinnedKey]);

  const others = useMemo(
    () => tracks.filter((tr) => getTrackKey(tr) !== getTrackKey(focused)),
    [tracks, focused]
  );

  if (!focused) return null;

  return (
    <div className="flex h-full w-full gap-2 p-1">
      {/* Big focus tile */}
      <div className="relative flex-1 min-w-0 overflow-hidden rounded-lg bg-slate-900">
        <ParticipantTile trackRef={focused} className="!h-full !w-full" />
        {pinnedKey && (
          <button
            type="button"
            onClick={() => onPin(null)}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/80"
            title={t("unpinTooltip")}
          >
            <PinOff className="size-3" />
            {t("unpin")}
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {others.length > 0 && (
        <div className="flex w-36 shrink-0 flex-col gap-2 overflow-y-auto pr-0.5 md:w-44">
          {others.map((trackRef) => {
            const key = getTrackKey(trackRef);
            const isPinned = pinnedKey === key;
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onPin(isPinned ? null : key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPin(isPinned ? null : key);
                  }
                }}
                className={`group relative aspect-video shrink-0 cursor-pointer overflow-hidden rounded-md bg-slate-900 ring-2 transition-all ${
                  isPinned
                    ? "ring-[var(--ev-amber)]"
                    : "ring-transparent hover:ring-white/40"
                }`}
                title={isPinned ? t("unpinTooltip") : t("pinTooltip")}
              >
                <ParticipantTile trackRef={trackRef} className="!h-full !w-full" />
                <div className="pointer-events-none absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Pin className="size-3 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const t = useTranslations("session");
  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"speaker" | "grid">("speaker");
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Auto-switch to speaker view the moment someone starts screen sharing —
  // grid view hides the shared screen in a tiny tile, which is never what
  // the presenter wants. Switch back to whatever the user had when the
  // screen share ends.
  const screenShareActive = tracks.some(
    (tr) => tr.source === Track.Source.ScreenShare && tr.publication?.track
  );
  const previousModeBeforeShareRef = useRef<"speaker" | "grid" | null>(null);
  useEffect(() => {
    if (screenShareActive) {
      if (layoutMode !== "speaker") {
        previousModeBeforeShareRef.current = layoutMode;
        setLayoutMode("speaker");
      }
    } else if (previousModeBeforeShareRef.current) {
      setLayoutMode(previousModeBeforeShareRef.current);
      previousModeBeforeShareRef.current = null;
    }
  }, [screenShareActive, layoutMode]);

  // If the pinned participant leaves, drop the pin so we fall back to auto-focus.
  useEffect(() => {
    if (!pinnedKey) return;
    const stillPresent = tracks.some((tr) => getTrackKey(tr) === pinnedKey);
    if (!stillPresent) setPinnedKey(null);
  }, [tracks, pinnedKey]);

  // Solo in the room → grid is simpler than a single big tile + empty strip.
  const effectiveMode = tracks.length <= 1 ? "grid" : layoutMode;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {userRole === "teacher" && <TeacherWaitingList liveClassId={liveClassId} />}
          <RaisedHandsPanel userRole={userRole} />
          {effectiveMode === "speaker" ? (
            <PresentationLayout
              tracks={tracks}
              pinnedKey={pinnedKey}
              onPin={setPinnedKey}
            />
          ) : (
            <GridLayout tracks={tracks} style={{ height: "100%" }}>
              <ParticipantTile />
            </GridLayout>
          )}
        </div>

        {/* Chat panel stays mounted even when hidden so useChat() keeps
            accumulating messages — otherwise closing + reopening the panel
            wipes the entire conversation. Layout space is collapsed via
            display:none when closed. */}
        <aside
          className="flex w-80 flex-col border-l border-white/10 bg-[var(--lk-bg,#111)] sm:w-96"
          style={{
            minWidth: chatOpen ? "288px" : "0",
            display: chatOpen ? "flex" : "none",
          }}
          aria-hidden={!chatOpen}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-sm font-medium text-white">
            <span>{t("chatPanelTitle")}</span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label={t("chatPanelClose")}
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
          onClick={() =>
            setLayoutMode((prev) => (prev === "speaker" ? "grid" : "speaker"))
          }
          disabled={tracks.length <= 1}
          className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          title={effectiveMode === "speaker" ? t("switchToGrid") : t("switchToSpeaker")}
        >
          {effectiveMode === "speaker" ? (
            <>
              <LayoutGrid className="size-4" />
              {t("layoutGrid")}
            </>
          ) : (
            <>
              <Maximize2 className="size-4" />
              {t("layoutSpeaker")}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setWhiteboardOpen((v) => !v)}
          className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
            whiteboardOpen
              ? "bg-[var(--ev-green)] text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={t("whiteboardTooltip")}
        >
          <Presentation className="size-4" />
          {t("whiteboardButton")}
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
