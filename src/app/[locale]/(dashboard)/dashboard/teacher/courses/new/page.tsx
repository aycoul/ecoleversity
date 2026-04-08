import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { CourseForm } from "@/components/teacher/course-form";

export default async function NewCoursePage() {
  const t = await getTranslations("course");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get teacher profile for subjects and grade levels
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
        <h1 className="text-2xl font-bold text-slate-900">{t("createCourse")}</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CourseForm subjects={subjects} gradeLevels={gradeLevels} />
      </div>
    </div>
  );
}
