"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  Video,
  LogOut,
  Star,
  PlayCircle,
} from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { LiveKitRoomEmbed } from "./livekit-room";
import { Link } from "@/i18n/routing";

type SessionState = "WAITING" | "READY" | "LIVE" | "ENDED";

type SessionRoomProps = {
  sessionId: string;
  scheduledAt: string;
  durationMinutes: number;
  teacherName: string;
  subjectLabel: string;
  userRole: "parent" | "teacher";
  recordingUrl?: string | null;
};

function computeState(
  scheduledAt: Date,
  durationMinutes: number
): SessionState {
  const now = Date.now();
  const startMs = scheduledAt.getTime();
  const endMs = startMs + durationMinutes * 60 * 1000;
  const fifteenMinBefore = startMs - 15 * 60 * 1000;

  if (now >= endMs) return "ENDED";
  if (now >= startMs) return "LIVE";
  if (now >= fifteenMinBefore) return "READY";
  return "WAITING";
}

export function SessionRoom({
  sessionId,
  scheduledAt,
  durationMinutes,
  teacherName,
  subjectLabel,
  userRole,
  recordingUrl,
}: SessionRoomProps) {
  const t = useTranslations("session");
  const scheduledDate = new Date(scheduledAt);

  const [state, setState] = useState<SessionState>(() =>
    computeState(scheduledDate, durationMinutes)
  );
  const [showRoom, setShowRoom] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Re-evaluate state every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = computeState(scheduledDate, durationMinutes);
      setState(newState);
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledDate, durationMinutes]);

  // Elapsed timer when LIVE
  useEffect(() => {
    if (state !== "LIVE" || !showRoom) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - scheduledDate.getTime()) / 1000
      );
      setElapsedSeconds(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [state, showRoom, scheduledDate]);

  const handleCountdownReady = useCallback(() => {
    setState("READY");
  }, []);

  const handleJoinClick = () => {
    setShowRoom(true);
    if (state === "READY") {
      // Will transition to LIVE once the scheduled time arrives
    }
  };

  const handleLeave = () => {
    setShowRoom(false);
  };

  // Display session time in Abidjan (GMT+0) regardless of viewer's
  // browser TZ. A diaspora parent and a teacher in Abidjan must see the
  // same clock time for the same booking.
  const formattedDate = scheduledDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Abidjan",
  });

  const formattedTime = scheduledDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });

  const formatElapsed = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Session info card (shared across states)
  const sessionInfoCard = (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {t("title")}
      </h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <User className="size-4 text-[var(--ev-blue)]" />
          <span>{t("sessionWith", { teacher: teacherName })}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <BookOpen className="size-4 text-[var(--ev-blue)]" />
          <span>{t("subject", { subject: subjectLabel })}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Calendar className="size-4 text-[var(--ev-blue)]" />
          <span>
            {t("dateTime", { date: formattedDate, time: formattedTime })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Clock className="size-4 text-[var(--ev-blue)]" />
          <span>{t("duration", { duration: String(durationMinutes) })}</span>
        </div>
      </div>
    </div>
  );

  // WAITING state
  if (state === "WAITING" && !showRoom) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {sessionInfoCard}

        <div className="rounded-xl border border-[var(--ev-green)]/10 bg-[var(--ev-green-50)] p-6 text-center">
          <p className="mb-2 text-sm text-[var(--ev-blue)]">{t("waiting")}</p>
          <div className="text-3xl">
            <CountdownTimer
              targetDate={
                new Date(scheduledDate.getTime() - 15 * 60 * 1000)
              }
              onReady={handleCountdownReady}
            />
          </div>
        </div>

        <button
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-400"
        >
          <Video className="size-4" />
          {t("join")}
        </button>

        <p className="text-center text-xs text-slate-400">
          {t("prepareTips")}
        </p>
      </div>
    );
  }

  // READY state
  if (state === "READY" && !showRoom) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {sessionInfoCard}

        <div className="rounded-xl border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] p-6 text-center">
          <p className="text-sm font-medium text-[var(--ev-blue)]">{t("ready")}</p>
        </div>

        <button
          onClick={handleJoinClick}
          className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-[var(--ev-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
        >
          <Video className="size-4" />
          {t("join")}
        </button>
      </div>
    );
  }

  // LIVE state — user just arrived, hasn't hit Join yet. Show info +
  // big green Rejoindre button. This covers the "I landed on the
  // session page before/during the class and want to enter" flow.
  if (state === "LIVE" && !showRoom) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {sessionInfoCard}

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
            </span>
            {t("live")}
          </div>
          <p className="text-sm text-rose-900/80">{t("liveNow")}</p>
        </div>

        <button
          type="button"
          onClick={handleJoinClick}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ev-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
        >
          <Video className="size-4" />
          {t("join")}
        </button>

        <p className="text-center text-xs text-slate-400">
          {t("prepareTips")}
        </p>
      </div>
    );
  }

  // LIVE / READY state with the LiveKit embed open
  if ((state === "LIVE" || state === "READY") && showRoom) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {t("live")}
            </span>
            {state === "LIVE" && (
              <span className="text-xs tabular-nums text-slate-500">
                {t("elapsed")}: {formatElapsed(elapsedSeconds)}
              </span>
            )}
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut className="size-3" />
            {t("leave")}
          </button>
        </div>

        <LiveKitRoomEmbed
          liveClassId={sessionId}
          userRole={userRole}
          onClose={handleLeave}
        />
      </div>
    );
  }

  // ENDED state
  if (state === "ENDED") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {sessionInfoCard}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-lg font-semibold text-slate-900">{t("ended")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("endedMessage")}</p>
        </div>

        {recordingUrl && (
          <a
            href={recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ev-blue)]/20 bg-[var(--ev-blue-50)] px-6 py-3 text-sm font-semibold text-[var(--ev-blue)] transition-colors hover:bg-[var(--ev-blue)]/10"
          >
            <PlayCircle className="size-4" />
            {t("watchRecording")}
          </a>
        )}

        {userRole === "parent" && (
          <Link
            href={`/dashboard/parent/sessions`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ev-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
          >
            <Star className="size-4" />
            {t("rateTeacher")}
          </Link>
        )}

        {userRole === "teacher" && (
          <Link
            href={`/dashboard/teacher/sessions`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ev-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
          >
            {t("upcoming")}
          </Link>
        )}
      </div>
    );
  }

  // Fallback (shouldn't happen)
  return null;
}
