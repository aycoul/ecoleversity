import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { Link } from "@/i18n/routing";
import { Calendar, Clock, User, Video } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentSessionsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("session");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // enrollments has learner_id, not parent_id — resolve through
  // learner_profiles. Admin client for the same reason as parent/overview:
  // RLS policy exists but the page already checked user identity above.
  const admin = createAdminClient();
  const { data: learnerRows } = await admin
    .from("learner_profiles")
    .select("id, first_name")
    .eq("parent_id", user.id);

  const learnerIds = (learnerRows ?? []).map((l) => l.id as string);
  const learnerName = new Map(
    (learnerRows ?? []).map((l) => [l.id as string, l.first_name as string])
  );

  const { data: enrollments } =
    learnerIds.length > 0
      ? await admin
          .from("enrollments")
          .select("live_class_id, learner_id")
          .in("learner_id", learnerIds)
      : { data: [] };

  const classIds = Array.from(
    new Set(
      (enrollments ?? [])
        .map((e) => e.live_class_id as string | null)
        .filter((v): v is string => !!v)
    )
  );

  // Fetch classes scheduled any time in the past 8 hours forward —
  // we need to show a session that's currently in progress (scheduled_at
  // is in the past, but end time is in the future). JS filter below
  // narrows to "upcoming OR in-progress" so past-and-done classes are
  // hidden without excluding an active session.
  const earliestWindow = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  const { data: sessionsRaw } =
    classIds.length > 0
      ? await admin
          .from("live_classes")
          .select(
            "id, scheduled_at, duration_minutes, status, subject, title, teacher_id"
          )
          .in("id", classIds)
          .eq("status", "scheduled")
          .gte("scheduled_at", earliestWindow)
          .order("scheduled_at", { ascending: true })
      : { data: [] };

  const nowMs = Date.now();
  const sessions = (sessionsRaw ?? []).filter((s) => {
    const start = new Date(s.scheduled_at as string).getTime();
    const end = start + (s.duration_minutes as number) * 60 * 1000;
    return end > nowMs;
  });

  // Batch teacher display names
  const teacherIds = Array.from(
    new Set((sessions ?? []).map((s) => s.teacher_id as string))
  );
  const { data: teacherRows } =
    teacherIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", teacherIds)
      : { data: [] };
  const teacherName = new Map(
    (teacherRows ?? []).map((p) => [
      p.id as string,
      (p.display_name as string | null) ?? "—",
    ])
  );

  // Learner labels per session
  const learnersByClass = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const clsId = e.live_class_id as string | null;
    if (!clsId) continue;
    const lid = e.learner_id as string;
    const name = learnerName.get(lid);
    if (!name) continue;
    const arr = learnersByClass.get(clsId) ?? [];
    arr.push(name);
    learnersByClass.set(clsId, arr);
  }

  const now = Date.now();

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
            const end =
              startMs + (session.duration_minutes as number) * 60 * 1000;
            const isJoinable = now >= startMs - 15 * 60 * 1000 && now <= end;
            const subjectLabel =
              SUBJECT_LABELS[session.subject as Subject] ??
              session.subject ??
              "—";
            const teacher =
              teacherName.get(session.teacher_id as string) ?? "—";
            const learners =
              learnersByClass.get(session.id as string)?.join(", ") ?? "—";

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
                    <User className="size-3" />
                    {t("sessionWith", { teacher })} · {learners}
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
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="size-3" />
                    {session.duration_minutes as number} min · {subjectLabel}
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
                  {isJoinable ? t("join") : "Bientôt"}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
