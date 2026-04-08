import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Plus, BookOpen, Clock, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";

export default async function TeacherCoursesPage() {
  const t = await getTranslations("course");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch teacher's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Get lesson counts per course
  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: lessons } = courseIds.length
    ? await supabase
        .from("lessons")
        .select("course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const lessonCounts: Record<string, number> = {};
  (lessons ?? []).forEach((l) => {
    lessonCounts[l.course_id] = (lessonCounts[l.course_id] ?? 0) + 1;
  });

  const allCourses = courses ?? [];
  const drafts = allCourses.filter((c) => c.status === "draft");
  const published = allCourses.filter((c) => c.status === "published");
  const archived = allCourses.filter((c) => c.status === "archived");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <Link href="/dashboard/teacher/courses/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 size-4" />
            {t("createCourse")}
          </Button>
        </Link>
      </div>

      {allCourses.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          {t("noCourses")}
        </p>
      )}

      {/* Published */}
      {published.length > 0 && (
        <CourseSection
          title={t("published")}
          courses={published}
          lessonCounts={lessonCounts}
          badgeColor="emerald"
          t={t}
        />
      )}

      {/* Draft */}
      {drafts.length > 0 && (
        <CourseSection
          title={t("draft")}
          courses={drafts}
          lessonCounts={lessonCounts}
          badgeColor="amber"
          t={t}
        />
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <CourseSection
          title={t("archived")}
          courses={archived}
          lessonCounts={lessonCounts}
          badgeColor="slate"
          t={t}
        />
      )}
    </div>
  );
}

type Course = {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  status: string;
  price_xof: number;
  total_duration_minutes: number;
  enrollment_count: number;
  thumbnail_url: string | null;
};

function CourseSection({
  title,
  courses,
  lessonCounts,
  badgeColor,
  t,
}: {
  title: string;
  courses: Course[];
  lessonCounts: Record<string, number>;
  badgeColor: string;
  t: ReturnType<typeof import("next-intl").useTranslations>;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-500",
  };
  const badge = colorMap[badgeColor] ?? colorMap.slate;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-800">
        {title} ({courses.length})
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/dashboard/teacher/courses/${course.id}`}
            className="group block"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow group-hover:shadow-md">
              <div className="flex items-start gap-3">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt=""
                    className="size-16 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-lg bg-slate-100">
                    <BookOpen className="size-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {course.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {SUBJECT_LABELS[course.subject as Subject] ?? course.subject}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {GRADE_LEVEL_LABELS[course.grade_level as GradeLevel] ?? course.grade_level}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                      {course.status === "draft" ? t("draft") : course.status === "published" ? t("published") : t("archived")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="size-3" />
                  {t("lessonCount", { count: lessonCounts[course.id] ?? 0 })}
                </span>
                {course.total_duration_minutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {course.total_duration_minutes} min
                  </span>
                )}
                {course.enrollment_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {course.enrollment_count}
                  </span>
                )}
                <span className="ml-auto font-medium text-slate-700">
                  {course.price_xof.toLocaleString("fr-CI")} FCFA
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
