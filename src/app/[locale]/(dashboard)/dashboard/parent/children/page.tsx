import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { GradeLevel, TargetExam } from "@/types/domain";
import { ChildrenManager } from "@/components/dashboard/parent/children-manager";
import { Users } from "lucide-react";

export default async function ParentChildrenPage() {
  const t = await getTranslations("dashboard.sidebar");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: children } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, target_exam, avatar_url, birth_year, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  const initial = (children ?? []).map((c) => ({
    id: c.id as string,
    first_name: c.first_name as string,
    grade_level: c.grade_level as GradeLevel,
    target_exam: (c.target_exam as TargetExam | null) ?? null,
    avatar_url: (c.avatar_url as string | null) ?? null,
    birth_year: (c.birth_year as number | null) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="size-6 text-[var(--ev-blue)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("myChildren")}</h1>
      </div>
      <p className="text-sm text-slate-500">
        Gérez les profils de vos enfants inscrits sur EcoleVersity.
      </p>

      <ChildrenManager initialChildren={initial} />
    </div>
  );
}
