import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { BookOpen, Play, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ParentCoursesPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("player");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all learners for this parent
  const { data: learners } = await supabase
    .from("learner_profiles")
    .select("id, first_name")
    .eq("parent_id", user.id);

  if (!learners || learners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="mb-4 size-16 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-900">{t("myCourses")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("noCourses")}</p>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ev-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ev-blue-light)]"
        >
          Parcourir les cours vidéo
        </Link>
      </div>
    );
  }

  const learnerIds = learners.map((l) => l.id);
  const learnerMap = new Map(learners.map((l) => [l.id, l.first_name]));

  // Fetch enrollments for all learners (course enrollments only)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, learner_id, course_id, progress_pct, completed_at")
    .in("learner_id", learnerIds)
    .not("course_id", "is", null)
    .order("enrolled_at", { ascending: false });

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="mb-4 size-16 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-900">{t("myCourses")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("noCourses")}</p>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ev-blue)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ev-blue-light)]"
        >
          Parcourir les cours vidéo
        </Link>
      </div>
    );
  }

  // Fetch course details
  const courseIds = [...new Set(enrollments.map((e) => e.course_id!))];
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, teacher_id, thumbnail_url")
    .in("id", courseIds);

  // Fetch teacher names
  const teacherIds = [
    ...new Set((courses ?? []).map((c) => c.teacher_id)),
  ];
  const { data: teachers } =
    teacherIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", teacherIds)
      : { data: [] };

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
  const teacherMap = new Map(
    (teachers ?? []).map((t) => [t.id, t.display_name])
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("myCourses")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((enrollment) => {
          const course = courseMap.get(enrollment.course_id!);
          if (!course) return null;

          const teacherName = teacherMap.get(course.teacher_id) ?? "—";
          const childName = learnerMap.get(enrollment.learner_id) ?? "—";
          const isCompleted = enrollment.completed_at != null;
          const progress = enrollment.progress_pct ?? 0;

          return (
            <div
              key={enrollment.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Thumbnail */}
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[var(--ev-green)] to-[var(--ev-blue)]">
                  <BookOpen className="size-10 text-white/80" />
                </div>
              )}

              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 line-clamp-2">
                  {course.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{teacherName}</span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {childName}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {t("progress", { percent: progress })}
                    </span>
                    {isCompleted && (
                      <CheckCircle className="size-3.5 text-[var(--ev-green)]" />
                    )}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? "bg-[var(--ev-green)]" : "bg-[var(--ev-green)]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <Link href={`/course/${course.id}`}>
                  <Button
                    size="sm"
                    className="w-full bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
                  >
                    <Play className="mr-1.5 size-3.5" />
                    {isCompleted ? t("resumeWatching") : t("continueCourse")}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
