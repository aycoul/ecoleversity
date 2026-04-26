import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayoutProcessor, type TeacherPayoutItem } from "@/components/admin/payout-processor";
import { Banknote, CircleCheck } from "lucide-react";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

export const dynamic = "force-dynamic";

/**
 * Founder/finance view of teacher payouts. The page accumulates two
 * shapes of work:
 *
 * 1. **Existing pending payouts** — rows already created (typically by
 *    /api/teacher/payout-request from the teacher's earnings page).
 *    These are processed via /api/admin/process-existing-payout to
 *    avoid the period-overlap check that would reject a new insert.
 *
 * 2. **Unsettled balance** — confirmed earnings minus completed AND
 *    pending payouts. When > 0, the founder can create a new payout
 *    via /api/admin/process-payout.
 *
 * Teachers without payout details are surfaced explicitly so the founder
 * can set them inline (calls /api/admin/teacher-payout-info) before
 * processing — no more silent "Informations manquantes" failures.
 */
export default async function AdminPayoutsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("payout");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  // Earned per teacher (confirmed class bookings only).
  const { data: confirmedTxs } = await adminSupabase
    .from("transactions")
    .select("teacher_id, teacher_amount")
    .eq("type", "class_booking")
    .eq("status", "confirmed");
  const earnedByTeacher = new Map<string, number>();
  for (const tx of confirmedTxs ?? []) {
    earnedByTeacher.set(
      tx.teacher_id as string,
      (earnedByTeacher.get(tx.teacher_id as string) ?? 0) + (tx.teacher_amount as number ?? 0)
    );
  }

  // Completed + pending payouts per teacher (we subtract BOTH so the
  // "create new payout" amount reflects truly-unsettled work).
  const { data: payoutRows } = await adminSupabase
    .from("teacher_payouts")
    .select("id, teacher_id, amount_xof, status, payout_phone, provider, period_start, period_end, created_at")
    .in("status", ["completed", "pending"])
    .order("created_at", { ascending: false });
  const completedTotal = new Map<string, number>();
  const pendingTotal = new Map<string, number>();
  const pendingPayouts: Array<{
    payoutId: string;
    teacherId: string;
    amountXof: number;
    payoutPhone: string;
    provider: string;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
  }> = [];
  for (const r of payoutRows ?? []) {
    if (r.status === "completed") {
      completedTotal.set(
        r.teacher_id as string,
        (completedTotal.get(r.teacher_id as string) ?? 0) + (r.amount_xof as number)
      );
    } else if (r.status === "pending") {
      pendingTotal.set(
        r.teacher_id as string,
        (pendingTotal.get(r.teacher_id as string) ?? 0) + (r.amount_xof as number)
      );
      pendingPayouts.push({
        payoutId: r.id as string,
        teacherId: r.teacher_id as string,
        amountXof: r.amount_xof as number,
        payoutPhone: (r.payout_phone as string) ?? "—",
        provider: (r.provider as string) ?? "—",
        periodStart: r.period_start as string,
        periodEnd: r.period_end as string,
        createdAt: r.created_at as string,
      });
    }
  }

  // Build the per-teacher item list. Include any teacher with either an
  // unsettled balance or a pending payout row.
  const teacherIds = new Set<string>();
  for (const id of earnedByTeacher.keys()) teacherIds.add(id);
  for (const id of pendingTotal.keys()) teacherIds.add(id);

  const items: TeacherPayoutItem[] = [];
  for (const teacherId of teacherIds) {
    const earned = earnedByTeacher.get(teacherId) ?? 0;
    const completed = completedTotal.get(teacherId) ?? 0;
    const inFlight = pendingTotal.get(teacherId) ?? 0;
    const newAvailable = earned - completed - inFlight;
    const teacherPending = pendingPayouts.filter((p) => p.teacherId === teacherId);

    if (newAvailable <= 0 && teacherPending.length === 0) continue;

    const [{ data: profileData }, { data: teacherProfile }] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("display_name")
        .eq("id", teacherId)
        .maybeSingle(),
      adminSupabase
        .from("teacher_profiles")
        .select("payout_phone, payout_provider")
        .eq("id", teacherId)
        .maybeSingle(),
    ]);

    items.push({
      teacherId,
      teacherName: (profileData?.display_name as string | null) ?? "—",
      profilePayoutPhone: (teacherProfile?.payout_phone as string | null) ?? null,
      profilePayoutProvider: (teacherProfile?.payout_provider as string | null) ?? null,
      newPayoutAmount: newAvailable > 0 ? newAvailable : 0,
      pendingPayouts: teacherPending.map((p) => ({
        payoutId: p.payoutId,
        amountXof: p.amountXof,
        payoutPhone: p.payoutPhone,
        provider: p.provider,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        createdAt: p.createdAt,
      })),
    });
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Banknote className="size-7 text-violet-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">
            {items.length > 0
              ? `${items.length} enseignant(s) avec versement à traiter`
              : "Versements enseignants — manuels pour l'instant."}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
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
        <PayoutProcessor items={items} />
      )}
    </div>
  );
}
