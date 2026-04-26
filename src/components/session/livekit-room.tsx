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
  useLocalParticipant,
  useMediaDeviceSelect,
  useSpeakingParticipants,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import {
  Track,
  RoomEvent,
  VideoPresets,
  type DataPublishOptions,
  type RemoteParticipant,
  type RoomOptions,
} from "livekit-client";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ModeratedChat } from "./moderated-chat";
import { SessionPoll } from "./session-poll";
import { SessionSlides } from "./session-slides";
import { CaptionsToggle, CaptionsOverlay } from "./session-captions";
import { useLocale } from "next-intl";
import { Hand, Users, Loader2, Presentation, LayoutGrid, Maximize2, Minimize2, Pin, PinOff, ChevronRight, ChevronLeft, MicOff, Settings2, Sparkles as BlurIcon, BarChart3, FileText, DoorOpen, Captions, MessageCircle, Monitor, MonitorOff } from "lucide-react";
import { Whiteboard } from "./whiteboard";

// LiveKit room options. Simulcast is on by default in the JS client but we
// pin the ladder explicitly so low-bandwidth subscribers (3G mobile in CI)
// fall back to the 180p layer without guessing. Adaptive stream lets the
// SFU pick the layer based on the subscriber's rendered tile size — a
// thumbnail subscriber gets the low layer, focus-tile subscribers get HD.
const LIVEKIT_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    videoCodec: "vp8",
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
};

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
// Takes actingAsLearnerId so the admission row's user_id matches the
// LiveKit participant identity (post-multi-kid-fix, that's the learner
// UUID, not the parent UUID). Without this, TeacherWaitingList sees
// every admitted kid as "still waiting" because the IDs don't line up.
function WaitingRoom({
  liveClassId,
  actingAsLearnerId,
  onAdmitted,
}: {
  liveClassId: string;
  actingAsLearnerId?: string;
  onAdmitted: () => void;
}) {
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
          // Teacher is here — self-admit using the LiveKit identity
          // (learner UUID when acting-as-learner, else the parent's).
          await fetch("/api/sessions/admission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              liveClassId,
              livekitIdentity: actingAsLearnerId ?? null,
            }),
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
  }, [liveClassId, actingAsLearnerId, onAdmitted]);

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

// ─── Teacher-only: mute every student's mic in one click ──────────────
function MuteAllButton({ liveClassId }: { liveClassId: string }) {
  const t = useTranslations("session");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/livekit/mute-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "mute-all failed");
      toast.success(t("muteAllDone", { count: data.muted ?? 0 }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-red-500/30"
        title={t("muteAllTooltip")}
      >
        <MicOff className="size-4" />
        {t("muteAll")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="lk-button flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MicOff className="size-4" />}
        {t("muteAllConfirm")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="lk-button rounded-md px-2 py-2 text-xs text-white/70 hover:bg-white/10"
      >
        {t("cancelShort")}
      </button>
    </div>
  );
}

// ─── Device picker: camera + mic + speaker ─────────────────────────────
function DevicePicker() {
  const t = useTranslations("session");
  const [open, setOpen] = useState(false);
  const cam = useMediaDeviceSelect({ kind: "videoinput" });
  const mic = useMediaDeviceSelect({ kind: "audioinput" });
  const spk = useMediaDeviceSelect({ kind: "audiooutput" });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
        title={t("devicePickerTooltip")}
        aria-expanded={open}
      >
        <Settings2 className="size-4" />
        {t("devicePicker")}
      </button>
      {open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            aria-label={t("cancelShort")}
          />
          <div className="absolute bottom-full right-0 z-40 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
            <DeviceSection
              label={t("deviceCamera")}
              devices={cam.devices}
              active={cam.activeDeviceId}
              onPick={(id) => cam.setActiveMediaDevice(id)}
            />
            <DeviceSection
              label={t("deviceMic")}
              devices={mic.devices}
              active={mic.activeDeviceId}
              onPick={(id) => mic.setActiveMediaDevice(id)}
            />
            {spk.devices.length > 0 && (
              <DeviceSection
                label={t("deviceSpeaker")}
                devices={spk.devices}
                active={spk.activeDeviceId}
                onPick={(id) => spk.setActiveMediaDevice(id)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DeviceSection({
  label,
  devices,
  active,
  onPick,
}: {
  label: string;
  devices: MediaDeviceInfo[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {devices.length === 0 && (
          <div className="text-xs text-slate-500">—</div>
        )}
        {devices.map((d) => {
          const selected = d.deviceId === active;
          return (
            <button
              key={d.deviceId}
              type="button"
              onClick={() => onPick(d.deviceId)}
              className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                selected
                  ? "bg-[var(--ev-blue)]/20 text-white"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <span className="truncate">{d.label || d.deviceId.slice(0, 8)}</span>
              {selected && <span className="text-[var(--ev-amber)]">●</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Background blur toggle ────────────────────────────────────────────
// Uses @livekit/track-processors BackgroundBlur. Client-side only; loads
// the processor lazily so first-paint of the room isn't delayed. If the
// runtime (tablet GPU, old browser) can't support the processor, the
// button hides itself — no broken feature, no scary error toast.
function BlurButton() {
  const t = useTranslations("session");
  const room = useRoomContext();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  // Probe for MediaStreamTrackGenerator + BackgroundBlur feasibility.
  // The track-processor internals use OffscreenCanvas + MediaStreamTrackGenerator
  // — both absent on iOS Safari and some older Android Chromes.
  useEffect(() => {
    const hasGenerator = typeof window !== "undefined" &&
      "MediaStreamTrackGenerator" in window;
    if (!hasGenerator) setSupported(false);
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      if (!track) return; // no camera — silently ignore
      if (enabled) {
        await track.stopProcessor();
        setEnabled(false);
      } else {
        const { BackgroundBlur } = await import("@livekit/track-processors");
        await track.setProcessor(BackgroundBlur(10));
        setEnabled(true);
      }
    } catch (err) {
      // Device can't run the processor — hide the button instead of popping
      // an error toast. User experience is "this wasn't meant for my device."
      console.warn("[blur] failed; hiding button:", err);
      setSupported(false);
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        enabled
          ? "bg-[var(--ev-blue)] text-white"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
      title={enabled ? t("blurOffTooltip") : t("blurOnTooltip")}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <BlurIcon className="size-4" />}
      {t("blur")}
    </button>
  );
}

// ─── Engagement tracker (teacher only, invisible) ──────────────────────
// Tracks how long each participant has been the active speaker and POSTs
// the roll-up to /api/sessions/engagement at unmount. Runs only in the
// teacher's browser so we have one authoritative source, not n copies.
function EngagementTracker({ liveClassId }: { liveClassId: string }) {
  const room = useRoomContext();
  const speakers = useSpeakingParticipants();
  const accumRef = useRef<Map<string, { name: string; speakingMs: number }>>(
    new Map()
  );
  // Initialise with 0; the first onSpeakersChange effect will stamp a real
  // timestamp. Avoids the react-hooks/purity warning for calling Date.now()
  // during render.
  const lastTickRef = useRef<number>(0);

  // Accumulate speaking time whenever the speakers array changes.
  useEffect(() => {
    const now = Date.now();
    const last = lastTickRef.current;
    lastTickRef.current = now;
    if (last === 0) return; // first tick — we only learn the interval on the second
    const delta = now - last;
    for (const p of speakers) {
      const prev = accumRef.current.get(p.identity) ?? {
        name: p.name || p.identity,
        speakingMs: 0,
      };
      accumRef.current.set(p.identity, {
        name: prev.name,
        speakingMs: prev.speakingMs + delta,
      });
    }
  }, [speakers]);

  // Flush on unmount (teacher leaves) or page-hide.
  useEffect(() => {
    const flush = () => {
      const engagement: Record<string, { name: string; speakingMs: number }> =
        {};
      for (const [identity, val] of accumRef.current.entries()) {
        engagement[identity] = val;
      }
      if (Object.keys(engagement).length === 0) return;
      try {
        const body = JSON.stringify({ liveClassId, engagement });
        navigator.sendBeacon?.(
          "/api/sessions/engagement",
          new Blob([body], { type: "application/json" })
        ) ||
          fetch("/api/sessions/engagement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
      } catch {
        // best-effort
      }
    };
    window.addEventListener("pagehide", flush);
    room.on(RoomEvent.Disconnected, flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      room.off(RoomEvent.Disconnected, flush);
    };
  }, [liveClassId, room]);

  return null;
}

// ─── Breakout rooms v1 ─────────────────────────────────────────────────
// Teacher triggers split → server returns per-participant tokens for
// sibling LiveKit rooms (session-{id}-bo-{N}). Teacher broadcasts the
// assignment map via the main-room data channel. Each client reads
// *only their own* assignment and asks the parent component to swap
// its token (which triggers LiveKitRoom to remount against the new
// room). "Return to main" requests a fresh main-room token and swaps
// back.
type BreakoutAssignment = {
  room: string;
  token: string;
  groupIdx: number;
  members: string[];
};
type BreakoutAssignMsg = {
  type: "breakout_assign";
  assignments: Record<string, BreakoutAssignment>;
};
type BreakoutEndMsg = { type: "breakout_end" };

function BreakoutButton({
  liveClassId,
  userRole,
  inBreakout,
  onSwap,
  onReturn,
}: {
  liveClassId: string;
  userRole: "parent" | "teacher";
  inBreakout: boolean;
  onSwap: (room: string, token: string, groupIdx: number, members: string[]) => void;
  onReturn: () => void;
}) {
  const t = useTranslations("session");
  const room = useRoomContext();
  const [composerOpen, setComposerOpen] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const [busy, setBusy] = useState(false);

  // Listen for assignments and end signals.
  useEffect(() => {
    const handler = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as
          | BreakoutAssignMsg
          | BreakoutEndMsg;
        if (msg.type === "breakout_assign") {
          const myId = room.localParticipant.identity;
          const mine = msg.assignments[myId];
          if (mine) onSwap(mine.room, mine.token, mine.groupIdx, mine.members);
        } else if (msg.type === "breakout_end") {
          onReturn();
        }
      } catch {
        // ignore
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, onSwap, onReturn]);

  const broadcast = (msg: BreakoutAssignMsg | BreakoutEndMsg) => {
    room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(msg)),
      { reliable: true } as DataPublishOptions
    );
  };

  const startBreakouts = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/livekit/breakouts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId, groupSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "breakout failed");
      // Broadcast then apply locally.
      broadcast({ type: "breakout_assign", assignments: data.assignments });
      const myId = room.localParticipant.identity;
      const mine = data.assignments[myId];
      if (mine) onSwap(mine.room, mine.token, mine.groupIdx, mine.members);
      setComposerOpen(false);
      toast.success(t("breakoutStarted", { count: data.groups.length }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const endBreakouts = () => {
    broadcast({ type: "breakout_end" });
    onReturn();
  };

  if (userRole !== "teacher") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (inBreakout ? endBreakouts() : setComposerOpen(true))}
        className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          inBreakout
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
        title={inBreakout ? t("breakoutEndTooltip") : t("breakoutTooltip")}
      >
        <DoorOpen className="size-4" />
        {inBreakout ? t("breakoutEnd") : t("breakout")}
      </button>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{t("breakoutCreate")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("breakoutHint")}</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t("breakoutGroupSize")}
            </label>
            <div className="mt-1 flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setGroupSize(n)}
                  className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
                    groupSize === n
                      ? "border-[var(--ev-blue)] bg-[var(--ev-blue-50)] text-[var(--ev-blue)]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setComposerOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                {t("cancelShort")}
              </button>
              <button
                onClick={startBreakouts}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ev-blue-light)] disabled:opacity-50"
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                {t("breakoutStart")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Banner visible to both teacher and students while inside a breakout room.
function BreakoutBanner({
  groupIdx,
  members,
  canEnd,
  onRequestMain,
}: {
  groupIdx: number;
  members: string[];
  canEnd: boolean;
  onRequestMain: () => void;
}) {
  const t = useTranslations("session");
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center">
      <div className="pointer-events-auto mt-3 flex max-w-[90%] items-center gap-3 rounded-full border border-[var(--ev-blue)]/30 bg-[var(--ev-blue)] px-4 py-2 text-sm font-semibold text-white shadow-lg">
        <DoorOpen className="size-4" />
        <span>
          {t("breakoutBanner", { n: groupIdx + 1 })}
          {members.length > 0 && ` · ${members.join(", ")}`}
        </span>
        {canEnd && (
          <button
            onClick={onRequestMain}
            className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium hover:bg-white/30"
          >
            {t("breakoutBackToMain")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Fullscreen toggle ─────────────────────────────────────────────────
// Requests fullscreen for the whole session container (video + control
// bar). Works across all modern browsers via the Fullscreen API.
function FullscreenButton({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const t = useTranslations("session");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = async () => {
    const el = targetRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // user cancelled or not supported — no-op
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
      title={isFullscreen ? t("fullscreenExitTooltip") : t("fullscreenTooltip")}
    >
      {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      <span className="hidden md:inline">
        {isFullscreen ? t("fullscreenExit") : t("fullscreen")}
      </span>
    </button>
  );
}

// ─── Overflow menu: "Plus" — secondary actions that don't fit in the primary bar ───
// Critical: children are rendered ALWAYS. When open=false we hide the
// dropdown container via CSS (transform translates it offscreen with
// pointer-events-none + opacity-0), so feature components inside retain
// their React state, event subscriptions, and in-flight modals across
// menu toggles. Unmounting-on-close was the root cause of "mute-all
// doesn't work / captions don't work / breakouts don't open" — every
// click reset the menu AND the state of everything inside.
function PlusMenu({ children }: { children: React.ReactNode }) {
  const t = useTranslations("session");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
        title={t("moreTooltip")}
        aria-expanded={open}
      >
        <Settings2 className="size-4" />
        {t("more")}
      </button>
      <div
        className={`absolute bottom-full right-0 z-40 mb-2 flex w-60 flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none -translate-y-2"
        }`}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Explicit Screen-Share Button ──────────────────────────────────────
// Replaces LiveKit's built-in screen-share toggle in our primary row.
// LiveKit's ControlBar sometimes hides the button on narrow viewports
// (mobile layout heuristics) — which is exactly when tablet users most
// want it. This version is always visible and always reachable.
// Calls setScreenShareEnabled on the local participant; errors (user
// cancels the picker, permission denied) are non-fatal.
function ScreenShareButton() {
  const t = useTranslations("session");
  // useLocalParticipant returns a reactive isScreenShareEnabled flag —
  // simpler and more reliable than wiring trackPublished/Unpublished
  // listeners ourselves (the previous approach desynced when the user
  // hit the browser's native "Stop sharing" toolbar instead of our
  // button, leaving sharing=true in React state and the button wedged
  // in red MonitorOff mode that did nothing on click).
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const sharing = !!isScreenShareEnabled;
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  // Detect support on mount. navigator.mediaDevices.getDisplayMedia is
  // absent on iOS Safari. On Android Chrome it's present and works.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== "function"
    ) {
      setSupported(false);
    }
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      // Read sharing state inline so the latest reactive value is used,
      // not a captured closure from a render where state was stale.
      await localParticipant.setScreenShareEnabled(!sharing, {
        audio: true, // capture tab audio if the user grants it
      });
    } catch (err) {
      console.warn("[screen-share]", err);
      // User probably cancelled the picker — no toast.
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        sharing
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
      title={sharing ? t("screenShareStopTooltip") : t("screenShareTooltip")}
      aria-pressed={sharing}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : sharing ? (
        <MonitorOff className="size-4" />
      ) : (
        <Monitor className="size-4" />
      )}
      <span className="hidden md:inline">
        {sharing ? t("screenShareStop") : t("screenShare")}
      </span>
    </button>
  );
}

// Zoom-style floating "you are sharing" banner. Always visible at the
// top of the video area when this user is currently screen-sharing, so
// they can stop without hunting for the control bar (which can scroll
// out of view on tablet portrait or be hidden behind the share preview).
function ScreenShareBanner() {
  const t = useTranslations("session");
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  if (!isScreenShareEnabled) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-50 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg ring-2 ring-red-300/40">
        <span className="size-2 animate-pulse rounded-full bg-white" />
        <span>{t("screenShareActive")}</span>
        <button
          type="button"
          onClick={() => {
            void localParticipant.setScreenShareEnabled(false);
          }}
          className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          {t("screenShareStop")}
        </button>
      </div>
    </div>
  );
}

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
  thumbnailsHidden,
  onToggleThumbnails,
}: {
  tracks: TrackReferenceOrPlaceholder[];
  pinnedKey: string | null;
  onPin: (key: string | null) => void;
  thumbnailsHidden: boolean;
  onToggleThumbnails: () => void;
}) {
  const t = useTranslations("session");
  // Layout: focus tile takes the full width on top, thumbnail strip runs
  // horizontally along the bottom (matches the Zoom speaker-view reference).
  // Previous version put thumbnails on the right — felt cramped on tablet
  // landscape where horizontal space is the limiting factor.

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
    <div className="flex h-full w-full flex-col gap-2 p-1">
      {/* Big focus tile — full-width, takes all vertical space the
          thumbnail strip doesn't use. */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-slate-900">
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

      {/* Collapsed-strip pill when thumbnails hidden */}
      {others.length > 0 && thumbnailsHidden && (
        <button
          type="button"
          onClick={onToggleThumbnails}
          className="self-center inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/80"
          title={t("showThumbnails")}
          aria-label={t("showThumbnails")}
        >
          <ChevronLeft className="size-3 rotate-90" />
          <span>{t("showThumbnails")} ({others.length})</span>
        </button>
      )}

      {/* Horizontal thumbnail strip along the bottom (Zoom style) */}
      {others.length > 0 && !thumbnailsHidden && (
        <div className="relative flex h-20 shrink-0 items-center gap-2 overflow-x-auto overflow-y-hidden pb-0.5 pt-1 sm:h-24">
          <button
            type="button"
            onClick={onToggleThumbnails}
            className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/70 hover:bg-white/20 hover:text-white"
            title={t("hideThumbnails")}
            aria-label={t("hideThumbnails")}
          >
            <ChevronRight className="size-3 rotate-90" />
          </button>
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
                className={`group relative aspect-video h-full shrink-0 cursor-pointer overflow-hidden rounded-md bg-slate-900 ring-2 transition-all ${
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
  // Fullscreen target — the outermost video container. Passed down to
  // RoomLayout so the FullscreenButton inside the control bar can flip it.
  const containerRef = useRef<HTMLDivElement>(null);
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inWaitingRoom, setInWaitingRoom] = useState(userRole === "parent");
  const teacherAdmittedRef = useRef(false);
  // Breakout state — null when in the main room, populated when swapped
  // into a sibling room. Survives across the LiveKitRoom remount (we key
  // LiveKitRoom on connection.token so a new token triggers reconnect).
  const [breakout, setBreakout] = useState<{
    groupIdx: number;
    members: string[];
  } | null>(null);

  const swapToBreakout = useCallback(
    (room: string, token: string, groupIdx: number, members: string[]) => {
      setConnection({ token, url: connection?.url ?? "", roomName: room });
      setBreakout({ groupIdx, members });
    },
    [connection?.url]
  );

  const returnToMain = useCallback(async () => {
    try {
      const res = await fetch("/api/livekit/breakouts/rejoin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "rejoin failed");
      setConnection((prev) => ({
        token: data.token,
        url: prev?.url ?? "",
        roomName: data.roomName,
      }));
      setBreakout(null);
    } catch (err) {
      console.error("[breakout/rejoin]", err);
    }
  }, [liveClassId]);

  // Teacher auto-admits themselves on mount. Teacher's LiveKit identity
  // matches their auth user.id (no learner mapping), so no livekitIdentity
  // override needed.
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
        actingAsLearnerId={actingAsLearnerId}
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
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-black"
      style={{ height: "min(82vh, 760px)", minHeight: "520px" }}
      data-lk-theme="default"
    >
      <LiveKitRoom
        key={connection.token}
        token={connection.token}
        serverUrl={connection.url}
        connect
        video
        audio
        options={LIVEKIT_ROOM_OPTIONS}
        onDisconnected={() => {
          // In a breakout, LiveKit disconnect is expected during the token
          // swap — let the new LiveKitRoom reconnect via the fresh key.
          // Only treat a disconnect as "leave the session" if we're in the
          // main room.
          if (!breakout) onClose?.();
        }}
        style={{ height: "100%" }}
      >
        <RoomLayout
          liveClassId={liveClassId}
          userRole={userRole}
          actingAsLearnerId={actingAsLearnerId}
          breakout={breakout}
          onSwapBreakout={swapToBreakout}
          onReturnToMain={returnToMain}
          containerRef={containerRef}
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
  breakout,
  onSwapBreakout,
  onReturnToMain,
  containerRef,
}: {
  liveClassId: string;
  userRole: "parent" | "teacher";
  actingAsLearnerId?: string;
  breakout: { groupIdx: number; members: string[] } | null;
  onSwapBreakout: (room: string, token: string, groupIdx: number, members: string[]) => void;
  onReturnToMain: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("session");
  const locale = useLocale() as "fr" | "en";
  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"speaker" | "grid">("speaker");
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [thumbnailsHidden, setThumbnailsHidden] = useState(false);

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
  // Using setTimeout(…,0) to defer the setState out of the effect's sync
  // phase — satisfies react-hooks/set-state-in-effect and doesn't change
  // observable behaviour for the user.
  useEffect(() => {
    const id = setTimeout(() => {
      if (screenShareActive) {
        if (layoutMode !== "speaker") {
          previousModeBeforeShareRef.current = layoutMode;
          setLayoutMode("speaker");
        }
      } else if (previousModeBeforeShareRef.current) {
        setLayoutMode(previousModeBeforeShareRef.current);
        previousModeBeforeShareRef.current = null;
      }
    }, 0);
    return () => clearTimeout(id);
  }, [screenShareActive, layoutMode]);

  // If the pinned participant leaves, drop the pin so we fall back to auto-focus.
  useEffect(() => {
    if (!pinnedKey) return;
    const stillPresent = tracks.some((tr) => getTrackKey(tr) === pinnedKey);
    if (!stillPresent) {
      const id = setTimeout(() => setPinnedKey(null), 0);
      return () => clearTimeout(id);
    }
  }, [tracks, pinnedKey]);

  // Solo in the room → grid is simpler than a single big tile + empty strip.
  const effectiveMode = tracks.length <= 1 ? "grid" : layoutMode;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {userRole === "teacher" && !breakout && <TeacherWaitingList liveClassId={liveClassId} />}
          {userRole === "teacher" && <EngagementTracker liveClassId={liveClassId} />}
          {breakout && (
            <BreakoutBanner
              groupIdx={breakout.groupIdx}
              members={breakout.members}
              canEnd={userRole === "teacher" || userRole === "parent"}
              onRequestMain={onReturnToMain}
            />
          )}
          <RaisedHandsPanel userRole={userRole} />
          <CaptionsOverlay />
          <ScreenShareBanner />
          {effectiveMode === "speaker" ? (
            <PresentationLayout
              tracks={tracks}
              pinnedKey={pinnedKey}
              onPin={setPinnedKey}
              thumbnailsHidden={thumbnailsHidden}
              onToggleThumbnails={() => setThumbnailsHidden((v) => !v)}
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

        {/* Whiteboard overlay (z-30) sits above the slides viewer (z-20)
            so a teacher can annotate over their slides if they open both.
            Kept mounted always (CSS-hidden when closed) so strokes drawn
            before closing the panel survive reopening. Full unmount would
            reset itemsRef, making the board appear empty on reopen. */}
        <div
          className={`absolute inset-0 z-30 ${whiteboardOpen ? "" : "hidden"}`}
          aria-hidden={!whiteboardOpen}
        >
          <Whiteboard onClose={() => setWhiteboardOpen(false)} />
        </div>
      </div>

      {/* Primary control bar — compact, identical on tablet + laptop.
          Only the essentials are always-visible. Secondary actions live
          under the "Plus" overflow menu so the bar never wraps onto two
          rows or pushes buttons off-screen.
          screenShare is disabled on LiveKit's ControlBar because it has
          responsive quirks on narrow viewports — we ship our own explicit
          <ScreenShareButton /> so tablet users always see the control. */}
      {/* flex-wrap (not overflow-x-auto) so the row never creates a
          clipping context — overflow:auto on either axis silently
          clips popovers like the Plus menu's dropdown that need to
          escape the bar bounds. With wrap, narrow viewports get a
          two-row bar instead of a horizontally-scrolling one. */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-[var(--lk-bg,#111)] px-2 py-2">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: false,
            chat: false,
            leave: true,
          }}
        />
        <ScreenShareButton />
        <RaiseHandButton />
        <button
          type="button"
          onClick={() => setWhiteboardOpen((v) => !v)}
          className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
            whiteboardOpen
              ? "bg-[var(--ev-green)] text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={t("whiteboardTooltip")}
          aria-pressed={whiteboardOpen}
        >
          <Presentation className="size-4" />
          <span className="hidden md:inline">{t("whiteboardButton")}</span>
        </button>
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
            chatOpen
              ? "bg-white text-slate-900"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          aria-pressed={chatOpen}
          title={chatOpen ? t("chatPanelClose") : t("chatPanelTitle")}
        >
          <MessageCircle className="size-4" />
          <span className="hidden md:inline">{t("chatPanelTitle")}</span>
        </button>

        {/* Overflow: layout, fullscreen, devices, blur, captions + teacher
            tools (slides, polls, mute-all, breakouts). */}
        <PlusMenu>
          <button
            type="button"
            onClick={() =>
              setLayoutMode((prev) => (prev === "speaker" ? "grid" : "speaker"))
            }
            disabled={tracks.length <= 1}
            className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40"
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
          <FullscreenButton targetRef={containerRef} />
          <DevicePicker />
          <BlurButton />
          <CaptionsToggle locale={locale} />
          <SessionPoll userRole={userRole} />
          <SessionSlides liveClassId={liveClassId} userRole={userRole} />
          {userRole === "teacher" && <MuteAllButton liveClassId={liveClassId} />}
          <BreakoutButton
            liveClassId={liveClassId}
            userRole={userRole}
            inBreakout={!!breakout}
            onSwap={onSwapBreakout}
            onReturn={onReturnToMain}
          />
        </PlusMenu>
      </div>
    </div>
  );
}
