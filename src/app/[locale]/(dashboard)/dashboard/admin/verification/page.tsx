import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TeacherVerificationCard } from "@/components/admin/teacher-verification-card";
import { ShieldCheck } from "lucide-react";

export default async function VerificationPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "school_admin")) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard.admin");

  // Fetch teachers pending verification with their profiles
  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select(`
      id,
      user_id,
      verification_status,
      subjects,
      grade_levels,
      cni_url,
      diploma_url,
      video_url,
      created_at,
      profiles!teacher_profiles_id_fkey (
        display_name,
        city,
        avatar_url
      )
    `)
    .not("verification_status", "in", '("fully_verified","rejected")')
    .order("created_at", { ascending: true });

  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck className="size-7 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("verification")}
          </h1>
          <p className="text-sm text-slate-500">
            {t("pendingTeachers")}
          </p>
        </div>
      </div>

      {!teachers || teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <ShieldCheck className="mb-4 size-12 text-[var(--ev-green)]" />
          <p className="text-sm font-semibold text-slate-700">{t("noPending")}</p>
          <p className="mt-1 text-xs text-slate-400">
            Les nouveaux dossiers enseignants apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => {
            const profileData = Array.isArray(teacher.profiles)
              ? teacher.profiles[0]
              : teacher.profiles;

            return (
              <TeacherVerificationCard
                key={teacher.id}
                teacherId={teacher.id}
                userId={teacher.user_id}
                name={profileData?.display_name ?? "—"}
                city={profileData?.city ?? "—"}
                avatarUrl={profileData?.avatar_url}
                subjects={(teacher.subjects as string[]) ?? []}
                gradeLevels={(teacher.grade_levels as string[]) ?? []}
                cniUrl={teacher.cni_url}
                diplomaUrl={teacher.diploma_url}
                videoUrl={teacher.video_url}
                createdAt={teacher.created_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
