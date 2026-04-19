import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  UpcomingSessionList,
  type UpcomingSession,
} from "@/components/dashboard/upcoming-session-list";
import {
  ContinueWatchingRail,
  type ContinueWatchingItem,
} from "@/components/dashboard/continue-watching-rail";
import { Award, PlayCircle, Video } from "lucide-react";
import { GRADE_LEVEL_LABELS, type GradeLevel } from "@/types/domain";

type PageProps = {
  params: Promise<{ learner_id: string }>;
};

export default async function KidHomePage({ params }: PageProps) {
  const { learner_id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("kid");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch learner (middleware already verified ownership but we need the data)
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, avatar_url")
    .eq("id", learner_id)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (!learner) redirect("/dashboard/parent/overview");

  // Enrollments for this learner
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, course_id, live_class_id, progress_pct, completed_at, last_lesson_id"
    )
    .eq("learner_id", learner_id);

  // Live classes enrolled
  const enrolledClassIds = (enrollments ?? [])
    .map((e) => e.live_class_id as string | null)
    .filter((id): id is string => !!id);

  const { data: liveClasses } =
    enrolledClassIds.length > 0
      ? await supabase
          .from("live_classes")
          .select(
            "id, title, scheduled_at, duration_minutes, subject, teacher_id"
          )
          .in("id", enrolledClassIds)
          .in("status", ["scheduled"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(5)
      : { data: [] };

  // Teachers
  const teacherIds = Array.from(
    new Set((liveClasses ?? []).map((c) => c.teacher_id as string))
  );
  const { data: teachers } =
    teacherIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", teacherIds)
      : { data: [] };

  // Courses in progress
  const courseIds = Array.from(
    new Set(
      (enrollments ?? [])
        .filter((e) => e.course_id && !e.completed_at)
        .map((e) => e.course_id as string)
    )
  );
  const { data: courses } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, title, cover_url")
          .in("id", courseIds)
      : { data: [] };

  // Shape upcoming sessions
  const upcomingSessions: UpcomingSession[] = (liveClasses ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    scheduled_at: new Date(c.scheduled_at as string),
    duration_minutes: c.duration_minutes as number,
    teacher_name:
      (teachers ?? []).find((t) => t.id === (c.teacher_id as string))
        ?.display_name ?? undefined,
    subject: c.subject as string,
    join_url: `/k/${learner_id}/class/${c.id}/room`,
  }));

  // Continue watching
  const continueWatching: ContinueWatchingItem[] = (enrollments ?? [])
    .filter((e) => e.course_id && !e.completed_at && (e.progress_pct ?? 0) > 0)
    .slice(0, 8)
    .map((e) => {
      const course = (courses ?? []).find(
        (c) => c.id === (e.course_id as string)
      );
      return {
        enrollment_id: e.id as string,
        course_id: e.course_id as string,
        course_title: (course?.title as string) ?? "Cours",
        course_cover_url: (course?.cover_url as string | null) ?? null,
        progress_pct: (e.progress_pct as number) ?? 0,
        last_lesson_id: (e.last_lesson_id as string | null) ?? null,
        learner_id: learner_id,
      };
    });

  const hasAnyContent =
    upcomingSessions.length > 0 || continueWatching.length > 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          {t("greeting", { name: learner.first_name })}
        </h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          {GRADE_LEVEL_LABELS[learner.grade_level as GradeLevel] ??
            learner.grade_level}
          {" · "}
          {new Date().toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Today's classes */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t("todaysClasses")}
        </h2>
        <UpcomingSessionList
          sessions={upcomingSessions}
          mode="kid"
          locale={locale}
          emptyMessage={t("emptyToday")}
        />
      </section>

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <ContinueWatchingRail items={continueWatching} kidMode />
      )}

      {/* Quick links to other kid sections */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link
          href={`/k/${learner_id}/classes`}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--ev-blue)] hover:shadow-md"
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--ev-blue-50)] text-[var(--ev-blue)]">
            <Video className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t("myClasses")}
            </div>
            <div className="text-xs text-slate-500">
              {t("myClassesSub")}
            </div>
          </div>
        </Link>
        <Link
          href={`/k/${learner_id}/courses`}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--ev-blue)] hover:shadow-md"
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--ev-green-50)] text-[var(--ev-green)]">
            <PlayCircle className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{t("myCourses")}</div>
            <div className="text-xs text-slate-500">{t("myCoursesSub")}</div>
          </div>
        </Link>
        <Link
          href={`/k/${learner_id}/achievements`}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--ev-blue)] hover:shadow-md"
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Award className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t("myAchievements")}
            </div>
            <div className="text-xs text-slate-500">{t("myAchievementsSub")}</div>
          </div>
        </Link>
      </div>

      {!hasAnyContent && (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">
            {t("noContent")}
          </p>
        </div>
      )}
    </div>
  );
}
