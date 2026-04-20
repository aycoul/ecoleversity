import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeacherVerificationCard } from "@/components/admin/teacher-verification-card";
import { ShieldCheck } from "lucide-react";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

export default async function VerificationPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();

  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (
    !profile ||
    profile.role !== "admin" ||
    !canAccess(scope, "verification")
  ) {
    redirect("/dashboard/admin");
  }

  const t = await getTranslations("dashboard.admin");

  // Use admin client — RLS on teacher_profiles restricts anon/auth-parent to
  // only fully_verified rows. Admins need to see every status.
  const adminSupabase = createAdminClient();

  // Show every teacher whose docs are still in flight — the 4 intermediate
  // enum values. Excluded: fully_verified (done), rejected (already refused),
  // banned (strike_3 removed them post-verification).
  const { data: teacherRows } = await adminSupabase
    .from("teacher_profiles")
    .select(
      "id, verification_status, subjects, grade_levels, id_document_url, diploma_url, video_intro_url, created_at, rejection_reason"
    )
    .in("verification_status", [
      "pending",
      "id_submitted",
      "diploma_submitted",
      "video_submitted",
    ])
    .order("created_at", { ascending: true });

  const teachers = teacherRows ?? [];

  // Batch profile lookup (name, city, avatar)
  const ids = teachers.map((t) => t.id as string);
  const { data: profileRows } = ids.length
    ? await adminSupabase
        .from("profiles")
        .select("id, display_name, city, avatar_url")
        .in("id", ids)
    : { data: [] };
  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id as string, p])
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-7 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("verification")}
          </h1>
          <p className="text-sm text-slate-500">{t("pendingTeachers")}</p>
        </div>
      </div>

      {teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <ShieldCheck className="mb-4 size-12 text-[var(--ev-green)]" />
          <p className="text-sm font-semibold text-slate-700">
            {t("noPending")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Les nouveaux dossiers enseignants apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => {
            const p = profileById.get(teacher.id as string);
            return (
              <TeacherVerificationCard
                key={teacher.id as string}
                teacherId={teacher.id as string}
                userId={teacher.id as string}
                name={(p?.display_name as string | undefined) ?? "—"}
                city={(p?.city as string | undefined) ?? "—"}
                avatarUrl={(p?.avatar_url as string | null | undefined) ?? null}
                subjects={(teacher.subjects as string[]) ?? []}
                gradeLevels={(teacher.grade_levels as string[]) ?? []}
                cniUrl={(teacher.id_document_url as string | null) ?? null}
                diplomaUrl={(teacher.diploma_url as string | null) ?? null}
                videoUrl={(teacher.video_intro_url as string | null) ?? null}
                createdAt={teacher.created_at as string}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
