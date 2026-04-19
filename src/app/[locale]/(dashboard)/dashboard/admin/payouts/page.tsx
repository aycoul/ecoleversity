import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayoutProcessor } from "@/components/admin/payout-processor";
import { Banknote, CircleCheck } from "lucide-react";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

export default async function AdminPayoutsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("payout");

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
  if (!profile || profile.role !== "admin" || !canAccess(scope, "payouts")) {
    redirect("/dashboard/admin");
  }

  const adminSupabase = createAdminClient();

  // Get all teachers who have confirmed transactions
  const { data: confirmedTxs } = await adminSupabase
    .from("transactions")
    .select("teacher_id, teacher_amount")
    .eq("type", "class_booking")
    .eq("status", "confirmed");

  // Group by teacher
  const teacherTotals = new Map<string, number>();
  for (const tx of confirmedTxs ?? []) {
    const current = teacherTotals.get(tx.teacher_id) ?? 0;
    teacherTotals.set(tx.teacher_id, current + tx.teacher_amount);
  }

  // Get completed payouts per teacher
  const { data: payouts } = await adminSupabase
    .from("teacher_payouts")
    .select("teacher_id, amount_xof")
    .eq("status", "completed");

  const paidTotals = new Map<string, number>();
  for (const p of payouts ?? []) {
    const current = paidTotals.get(p.teacher_id) ?? 0;
    paidTotals.set(p.teacher_id, current + p.amount_xof);
  }

  // Calculate pending per teacher
  const pendingTeachers: Array<{
    teacherId: string;
    pendingAmount: number;
  }> = [];

  for (const [teacherId, total] of teacherTotals) {
    const paidOut = paidTotals.get(teacherId) ?? 0;
    const pending = total - paidOut;
    if (pending > 0) {
      pendingTeachers.push({ teacherId, pendingAmount: pending });
    }
  }

  // Enrich with teacher profile info
  const enriched = await Promise.all(
    pendingTeachers.map(async ({ teacherId, pendingAmount }) => {
      const [{ data: profileData }, { data: teacherProfile }] =
        await Promise.all([
          adminSupabase
            .from("profiles")
            .select("display_name")
            .eq("id", teacherId)
            .single(),
          adminSupabase
            .from("teacher_profiles")
            .select("payout_phone, payout_provider")
            .eq("id", teacherId)
            .single(),
        ]);

      return {
        teacherId,
        teacherName: profileData?.display_name ?? "—",
        payoutPhone: teacherProfile?.payout_phone ?? "—",
        payoutProvider: teacherProfile?.payout_provider ?? "—",
        pendingAmount,
      };
    })
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Banknote className="size-7 text-violet-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">
            {enriched.length > 0
              ? `${enriched.length} enseignant(s) en attente`
              : "Versements enseignants — manuels pour l'instant."}
          </p>
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <CircleCheck className="mb-3 size-12 text-[var(--ev-green)]" />
          <p className="text-sm font-semibold text-slate-700">
            Aucun versement en attente
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Les enseignants avec des gains confirmés apparaîtront ici.
          </p>
        </div>
      ) : (
        <PayoutProcessor teachers={enriched} />
      )}
    </div>
  );
}
