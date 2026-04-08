import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GroupClassForm } from "@/components/teacher/group-class-form";

export default async function NewGroupClassPage() {
  const t = await getTranslations("groupClass");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch teacher profile for subjects and grade_levels
  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("subjects, grade_levels")
    .eq("id", user.id)
    .single();

  if (!teacherProfile) {
    redirect("/dashboard/teacher");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("createClass")}</h1>
      <GroupClassForm
        subjects={teacherProfile.subjects ?? []}
        gradeLevels={teacherProfile.grade_levels ?? []}
      />
    </div>
  );
}
