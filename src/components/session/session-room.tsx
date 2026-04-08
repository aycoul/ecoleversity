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
} from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { JitsiEmbed } from "./jitsi-embed";
import { getJitsiMeetUrl } from "@/lib/video/jitsi";
import { Link } from "@/i18n/routing";

type SessionState = "WAITING" | "READY" | "LIVE" | "ENDED";

type SessionRoomProps = {
  sessionId: string;
  jitsiRoomId: string;
  scheduledAt: string;
  durationMinutes: number;
  teacherName: string;
  subjectLabel: string;
  userName: string;
  userRole: "parent" | "teacher";
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
  jitsiRoomId,
  scheduledAt,
  durationMinutes,
  teacherName,
  subjectLabel,
  userName,
  userRole,
}: SessionRoomProps) {
  const t = useTranslations("session");
  const scheduledDate = new Date(scheduledAt);

  const [state, setState] = useState<SessionState>(() =>
    computeState(scheduledDate, durationMinutes)
  );
  const [showJitsi, setShowJitsi] = useState(false);
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
    if (state !== "LIVE" || !showJitsi) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - scheduledDate.getTime()) / 1000
      );
      setElapsedSeconds(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [state, showJitsi, scheduledDate]);

  const handleCountdownReady = useCallback(() => {
    setState("READY");
  }, []);

  const handleJoinClick = () => {
    setShowJitsi(true);
    if (state === "READY") {
      // Will transition to LIVE once the scheduled time arrives
    }
  };

  const handleLeave = () => {
    setShowJitsi(false);
  };

  const formattedDate = scheduledDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = scheduledDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
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
          <User className="size-4 text-emerald-600" />
          <span>{t("sessionWith", { teacher: teacherName })}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <BookOpen className="size-4 text-emerald-600" />
          <span>{t("subject", { subject: subjectLabel })}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Calendar className="size-4 text-emerald-600" />
          <span>
            {t("dateTime", { date: formattedDate, time: formattedTime })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Clock className="size-4 text-emerald-600" />
          <span>{t("duration", { duration: String(durationMinutes) })}</span>
        </div>
      </div>
    </div>
  );

  // WAITING state
  if (state === "WAITING" && !showJitsi) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {sessionInfoCard}

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
          <p className="mb-2 text-sm text-emerald-700">{t("waiting")}</p>
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
  if (state === "READY" && !showJitsi) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {sessionInfoCard}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-sm font-medium text-emerald-700">{t("ready")}</p>
        </div>

        <button
          onClick={handleJoinClick}
          className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Video className="size-4" />
          {t("join")}
        </button>
      </div>
    );
  }

  // LIVE state (or READY with Jitsi open)
  if ((state === "LIVE" || state === "READY") && showJitsi) {
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

        <JitsiEmbed
          roomId={jitsiRoomId}
          userName={userName}
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

        {userRole === "parent" && (
          <Link
            href={`/dashboard/parent/sessions`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Star className="size-4" />
            {t("rateTeacher")}
          </Link>
        )}

        {userRole === "teacher" && (
          <Link
            href={`/dashboard/teacher/sessions`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
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
