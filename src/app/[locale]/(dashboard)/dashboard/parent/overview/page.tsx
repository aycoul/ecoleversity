import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { BookOpen, Calendar, Video, TrendingUp } from "lucide-react";

export default async function ParentOverviewPage() {
  const t = await getTranslations("parentOverview");
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all children
  const { data: children } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level")
    .eq("parent_id", user.id);

  // Fetch enrollments for all children
  const childIds = (children ?? []).map((c) => c.id);

  const { data: enrollments } = childIds.length > 0
    ? await supabase
        .from("enrollments")
        .select("id, learner_id, course_id, live_class_id, progress_pct, completed_at")
        .in("learner_id", childIds)
    : { data: [] };

  // Fetch enrolled class IDs for this parent's children
  const enrolledClassIds = (enrollments ?? [])
    .map((e) => e.live_class_id)
    .filter((id): id is string => !!id);

  // Fetch upcoming sessions only for enrolled classes
  const { data: upcomingSessions } = enrolledClassIds.length > 0
    ? await supabase
        .from("live_classes")
        .select("id, title, scheduled_at, duration_minutes, subject")
        .in("id", enrolledClassIds)
        .in("status", ["scheduled"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5)
    : { data: [] };

  // Fetch courses for enrollment details
  const courseIds = (enrollments ?? []).map((e) => e.course_id).filter(Boolean);
  const { data: courses } = courseIds.length > 0
    ? await supabase
        .from("courses")
        .select("id, title, subject")
        .in("id", courseIds)
    : { data: [] };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {/* Children cards */}
      {(children ?? []).map((child) => {
        const childEnrollments = (enrollments ?? []).filter((e) => e.learner_id === child.id);
        const activeCount = childEnrollments.filter((e) => !e.completed_at).length;
        const completedCount = childEnrollments.filter((e) => e.completed_at).length;

        return (
          <div key={child.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--ev-blue-50)] text-sm font-bold text-[var(--ev-blue)]">
                {child.first_name[0]}
              </div>
              <div>
                <h2 className="font-bold text-slate-900">{child.first_name}</h2>
                <p className="text-xs text-slate-500">{child.grade_level}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-lg font-bold text-[var(--ev-blue)]">{activeCount}</p>
                <p className="text-xs text-slate-500">{t("activeCourses")}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-lg font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-slate-500">{t("completed")}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-lg font-bold text-amber-600">
                  {childEnrollments.length > 0
                    ? Math.round(childEnrollments.reduce((sum, e) => sum + (e.progress_pct ?? 0), 0) / childEnrollments.length)
                    : 0}%
                </p>
                <p className="text-xs text-slate-500">{t("avgProgress")}</p>
              </div>
            </div>

            {/* Course progress bars */}
            {childEnrollments.filter((e) => !e.completed_at).map((enrollment) => {
              const course = courses?.find((c) => c.id === enrollment.course_id);
              return (
                <div key={enrollment.id} className="mb-2 flex items-center gap-3">
                  <BookOpen className="size-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {course?.title ?? "Cours"}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[var(--ev-green)]"
                        style={{ width: `${enrollment.progress_pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{enrollment.progress_pct ?? 0}%</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Upcoming sessions */}
      {upcomingSessions && upcomingSessions.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Calendar className="size-5 text-[var(--ev-blue)]" />
            {t("upcomingSessions")}
          </h2>
          <div className="space-y-2">
            {upcomingSessions.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 transition-colors hover:border-[var(--ev-blue)]/10"
              >
                <div className="flex items-center gap-3">
                  <Video className="size-5 text-[var(--ev-green)]" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-400">
                      {SUBJECT_LABELS[s.subject as Subject] ?? s.subject} · {new Date(s.scheduled_at).toLocaleDateString("fr-CI", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <TrendingUp className="size-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!children || children.length === 0) && (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-sm text-slate-400">{t("noChildren")}</p>
          <Link
            href="/onboarding/parent"
            className="mt-3 inline-block text-sm font-medium text-[var(--ev-blue)] hover:underline"
          >
            {t("addChild")}
          </Link>
        </div>
      )}
    </div>
  );
}
