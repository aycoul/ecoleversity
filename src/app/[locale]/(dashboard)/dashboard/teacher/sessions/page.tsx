import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { Link } from "@/i18n/routing";
import { Calendar, Clock, Users, Video, PlayCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherSessionsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("session");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use admin client — enrollments/profiles read across learner→parent
  // needs joins that weren't in the RLS policy. Teacher ownership is
  // enforced by the .eq("teacher_id", user.id) filter below.
  const adminSupabase = createAdminClient();

  // Upcoming + in-progress only — a class that started up to 8h ago
  // but whose duration still covers "now" must still show a Rejoindre.
  const earliestWindow = new Date(
    Date.now() - 8 * 60 * 60 * 1000
  ).toISOString();
  const { data: sessionsRaw } = await adminSupabase
    .from("live_classes")
    .select(
      "id, scheduled_at, duration_minutes, status, subject, title"
    )
    .eq("teacher_id", user.id)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", earliestWindow)
    .order("scheduled_at", { ascending: true });
  const nowMs = Date.now();
  const sessions = (sessionsRaw ?? []).filter((s) => {
    const start = new Date(s.scheduled_at as string).getTime();
    const end = start + (s.duration_minutes as number) * 60 * 1000;
    return end > nowMs;
  });

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  const { data: enrollmentRows } =
    sessionIds.length > 0
      ? await adminSupabase
          .from("enrollments")
          .select("live_class_id, learner_id")
          .in("live_class_id", sessionIds)
      : { data: [] };

  const enrolledByClass = new Map<string, number>();
  const learnerIdsByClass = new Map<string, string[]>();
  for (const e of enrollmentRows ?? []) {
    const k = e.live_class_id as string;
    enrolledByClass.set(k, (enrolledByClass.get(k) ?? 0) + 1);
    const list = learnerIdsByClass.get(k) ?? [];
    list.push(e.learner_id as string);
    learnerIdsByClass.set(k, list);
  }

  const allLearnerIds = Array.from(
    new Set((enrollmentRows ?? []).map((e) => e.learner_id as string))
  );
  const { data: learnerRows } =
    allLearnerIds.length > 0
      ? await adminSupabase
          .from("learner_profiles")
          .select("id, first_name")
          .in("id", allLearnerIds)
      : { data: [] };
  const learnerName = new Map(
    (learnerRows ?? []).map((l) => [l.id as string, l.first_name as string])
  );

  const now = Date.now();

  // Past sessions with completed recordings — last 30 across all of this
  // teacher's classes. We don't need to re-authorize since teacher_id
  // filter already narrows live_classes to their own.
  const { data: myClassRows } = await adminSupabase
    .from("live_classes")
    .select("id, title, subject, scheduled_at, duration_minutes")
    .eq("teacher_id", user.id);
  const myClassIds = (myClassRows ?? []).map((c) => c.id as string);
  const myClassById = new Map(
    (myClassRows ?? []).map((c) => [c.id as string, c])
  );

  const { data: recRows } =
    myClassIds.length > 0
      ? await adminSupabase
          .from("session_recordings")
          .select("id, live_class_id, duration_seconds, ended_at, summary, ai_status")
          .in("live_class_id", myClassIds)
          .eq("status", "completed")
          .order("ended_at", { ascending: false })
          .limit(30)
      : { data: [] };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} min ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("upcoming")}</h1>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <Calendar className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t("noSessions")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const scheduledAt = new Date(session.scheduled_at as string);
            const startMs = scheduledAt.getTime();
            const isJoinable = now >= startMs - 15 * 60 * 1000;
            const subjectLabel =
              SUBJECT_LABELS[session.subject as Subject] ??
              session.subject ??
              "—";
            const enrollmentCount =
              enrolledByClass.get(session.id as string) ?? 0;
            const learners = (
              learnerIdsByClass.get(session.id as string) ?? []
            )
              .map((lid) => learnerName.get(lid))
              .filter(Boolean)
              .slice(0, 3)
              .join(", ");

            return (
              <div
                key={session.id as string}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {(session.title as string) ?? subjectLabel}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="size-3" />
                    {scheduledAt.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: "Africa/Abidjan",
                    })}
                    {" — "}
                    {scheduledAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Abidjan",
                    })}
                    {" GMT"}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {session.duration_minutes as number} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {enrollmentCount}{" "}
                      {enrollmentCount === 1 ? "inscrit" : "inscrits"}
                      {learners && ` · ${learners}`}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/session/${session.id}`}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    isJoinable
                      ? "bg-[var(--ev-blue)] text-white shadow-sm hover:bg-[var(--ev-blue-light)]"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Video className="size-3" />
                  {t("join")}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {recRows && recRows.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Séances passées
          </h2>
          <div className="space-y-3">
            {recRows.map((rec) => {
              const cls = myClassById.get(rec.live_class_id as string);
              if (!cls) return null;
              const scheduledAt = new Date(cls.scheduled_at as string);
              const subjectLabel =
                SUBJECT_LABELS[cls.subject as Subject] ??
                cls.subject ??
                "—";
              const summary = rec.summary as string | null;
              const aiStatus = rec.ai_status as string | null;
              return (
                <div
                  key={rec.id as number}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="text-sm font-semibold text-slate-900">
                        {(cls.title as string) ?? subjectLabel}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="size-3" />
                        {scheduledAt.toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          timeZone: "Africa/Abidjan",
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="size-3" />
                        {formatDuration(rec.duration_seconds as number | null)}
                        {" · "}
                        {subjectLabel}
                      </div>
                    </div>

                    <a
                      href={`/api/recordings/${cls.id}/play?recordingId=${rec.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
                    >
                      <PlayCircle className="size-3" />
                      Revoir
                    </a>
                  </div>

                  {summary ? (
                    <details className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                      <summary className="cursor-pointer font-semibold text-slate-900">
                        Résumé IA du cours
                      </summary>
                      <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                        {summary}
                      </div>
                    </details>
                  ) : aiStatus === "processing" ? (
                    <div className="mt-3 text-xs italic text-slate-400">
                      Résumé IA en cours de génération…
                    </div>
                  ) : aiStatus === "failed" ? (
                    <div className="mt-3 text-xs italic text-rose-500">
                      Résumé IA indisponible.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
