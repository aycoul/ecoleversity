import Link from "next/link";
import { Video, Calendar, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyClassesIllustration } from "@/components/common/empty-state-illustrations";

export type UpcomingSession = {
  id: string;
  title: string;
  scheduled_at: Date;
  duration_minutes: number;
  teacher_name?: string;
  learner_name?: string;
  subject?: string;
  join_url?: string;
};

export type UpcomingSessionListProps = {
  sessions: UpcomingSession[];
  mode: "parent" | "kid" | "teacher";
  locale: string;
  emptyMessage?: string;
};

function isJoinable(session: UpcomingSession): boolean {
  const now = Date.now();
  const start = session.scheduled_at.getTime();
  const end = start + session.duration_minutes * 60 * 1000;
  // Joinable from 10 min before start until end
  return now >= start - 10 * 60 * 1000 && now < end;
}

export async function UpcomingSessionList({
  sessions,
  mode,
  locale,
  emptyMessage,
}: UpcomingSessionListProps) {
  const t = await getTranslations("dashboardCommon");
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-[var(--ev-blue-50)] p-10 text-center">
        <EmptyClassesIllustration className="size-20" />
        <p className="mt-4 text-sm font-semibold text-[var(--ev-blue)]">
          {emptyMessage ??
            (mode === "kid" ? t("emptyUpcomingKid") : t("emptyUpcomingParent"))}
        </p>
        {mode !== "teacher" && (
          <Link
            href="/classes"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[var(--ev-blue)] shadow-sm hover:bg-[var(--ev-blue-50)]"
          >
            Parcourir les classes <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    );
  }

  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const joinable = isJoinable(session);
        // Always land on the session page — it handles every state
        // (waiting → countdown, ready → join CTA, live → embed, ended
        // → recording). Users tapping the card get the same affordance
        // before the class starts as during the class.
        const href = session.join_url ?? `/session/${session.id}`;
        return (
          <Link
            key={session.id}
            href={href}
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-[var(--ev-blue)] hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ev-blue-50)] text-[var(--ev-blue)]">
              <Video className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="truncate text-sm font-semibold text-slate-900">{session.title}</h4>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {fmt.format(session.scheduled_at)}
                </span>
                {mode !== "kid" && session.learner_name && (
                  <span>· {session.learner_name}</span>
                )}
                {mode !== "teacher" && session.teacher_name && (
                  <span>· {session.teacher_name}</span>
                )}
              </div>
            </div>
            {joinable ? (
              <span className="shrink-0 rounded-lg bg-[var(--ev-green)] px-4 py-2 text-sm font-semibold text-white">
                {t("join")}
              </span>
            ) : (
              <ChevronRight className="size-5 shrink-0 text-slate-400" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
