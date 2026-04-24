import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeaturedTeacherManager } from "@/components/admin/featured-teacher-manager";
import { Sparkles } from "lucide-react";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedTeachersPage() {
  const t = await getTranslations("dashboard.adminFeatured");
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();

  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (!profile || profile.role !== "admin" || !canAccess(scope, "analytics")) {
    redirect("/dashboard/admin");
  }

  const admin = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: featured } = await admin
    .from("featured_teachers")
    .select("id, teacher_id, start_date, end_date, amount_paid_xof, placement, active")
    .order("created_at", { ascending: false })
    .limit(100);

  const teacherIds = (featured ?? []).map((f) => f.teacher_id as string);

  const { data: teachers } = teacherIds.length > 0
    ? await admin.from("profiles").select("id, display_name").in("id", teacherIds)
    : { data: [] };

  const teacherName = new Map(
    (teachers ?? []).map((t) => [t.id as string, (t.display_name as string) ?? "—"])
  );

  const items = (featured ?? []).map((f) => ({
    id: f.id as string,
    teacher_id: f.teacher_id as string,
    teacher_name: teacherName.get(f.teacher_id as string) ?? "—",
    start_date: f.start_date as string,
    end_date: f.end_date as string,
    amount_paid_xof: f.amount_paid_xof as number,
    placement: f.placement as string,
    active: f.active as boolean,
    is_current:
      (f.start_date as string) <= today && (f.end_date as string) >= today && (f.active as boolean),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="size-7 text-[var(--ev-amber)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      <FeaturedTeacherManager initialItems={items} />
    </div>
  );
}
