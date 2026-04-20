import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { Link } from "@/i18n/routing";
import { Calendar, Clock, Users, Video } from "lucide-react";

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

  const { data: sessions } = await adminSupabase
    .from("live_classes")
    .select(
      "id, scheduled_at, duration_minutes, status, subject, title"
    )
    .eq("teacher_id", user.id)
    .in("status", ["scheduled", "live"])
    .order("scheduled_at", { ascending: true });

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
    </div>
  );
}
