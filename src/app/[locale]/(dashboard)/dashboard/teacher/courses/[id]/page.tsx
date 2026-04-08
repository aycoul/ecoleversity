import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { CourseForm } from "@/components/teacher/course-form";
import { LessonManager } from "@/components/teacher/lesson-manager";
import { CourseActions } from "@/components/teacher/course-actions";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const t = await getTranslations("course");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the course
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();

  if (!course) notFound();

  // Fetch lessons
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  // Get teacher profile
  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("subjects, grade_levels")
    .eq("id", user.id)
    .single();

  const subjects = teacherProfile?.subjects ?? [];
  const gradeLevels = teacherProfile?.grade_levels ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/teacher/courses"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t("editCourse")}</h1>
      </div>

      {/* Course details form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CourseForm
          subjects={subjects}
          gradeLevels={gradeLevels}
          courseId={courseId}
          initialData={{
            title: course.title,
            description: course.description ?? "",
            subject: course.subject,
            gradeLevel: course.grade_level,
            examType: course.exam_type,
            language: course.language,
            priceXof: course.price_xof,
            thumbnailUrl: course.thumbnail_url,
            status: course.status,
          }}
        />
      </div>

      {/* Lessons */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LessonManager courseId={courseId} initialLessons={lessons ?? []} />
      </div>

      {/* Publish / Archive / Delete */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CourseActions
          courseId={courseId}
          currentStatus={course.status}
          hasLessonsWithVideo={(lessons ?? []).some((l) => l.video_url)}
        />
      </div>
    </div>
  );
}
