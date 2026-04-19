import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Award } from "lucide-react";

type PageProps = {
  params: Promise<{ learner_id: string }>;
};

export default async function KidAchievementsPage({ params }: PageProps) {
  const { learner_id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("kid");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id, first_name")
    .eq("id", learner_id)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (!learner) redirect("/dashboard/parent/overview");

  // Completed courses = first-pass achievements
  const { data: completed } = await supabase
    .from("enrollments")
    .select("id, course_id, completed_at")
    .eq("learner_id", learner_id)
    .not("completed_at", "is", null);

  const courseIds = (completed ?? [])
    .map((e) => e.course_id as string | null)
    .filter((id): id is string => !!id);
  const { data: courses } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, title")
          .in("id", courseIds)
      : { data: [] };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Award className="size-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-slate-900">{t("myAchievements")}</h1>
      </div>

      {(completed ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <Award className="mx-auto size-12 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">
            {t("emptyAchievements")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(completed ?? []).map((e) => {
            const course = (courses ?? []).find(
              (c) => c.id === (e.course_id as string)
            );
            const formattedDate = new Date(
              e.completed_at as string
            ).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <div
                key={e.id as string}
                className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6"
              >
                <Award className="size-10 text-amber-500" />
                <h3 className="mt-3 font-semibold text-slate-900">
                  {(course?.title as string) ?? t("courseCompleted")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {t("completedOn", { date: formattedDate })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
