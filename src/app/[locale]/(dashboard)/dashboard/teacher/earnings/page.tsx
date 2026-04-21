import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EarningsDashboard } from "@/components/teacher/earnings-dashboard";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { Wallet } from "lucide-react";

export default async function TeacherEarningsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("earnings");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "teacher") {
    redirect("/");
  }

  // Fetch confirmed transactions for this teacher
  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      "id, amount_xof, teacher_amount, commission_amount, status, created_at, parent_id"
    )
    .eq("teacher_id", user.id)
    .eq("type", "class_booking")
    .order("created_at", { ascending: false });

  // Resolve parent names and live class subjects
  const enriched = await Promise.all(
    (transactions ?? []).map(async (tx) => {
      const { data: parentProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", tx.parent_id)
        .single();

      return {
        id: tx.id,
        parentName: parentProfile?.display_name ?? "—",
        subject: "—",
        teacherAmount: tx.teacher_amount,
        commissionAmount: tx.commission_amount,
        status: tx.status,
        createdAt: tx.created_at,
      };
    })
  );

  // Calculate totals from confirmed transactions
  const confirmedTxs = (transactions ?? []).filter(
    (tx) => tx.status === "confirmed"
  );

  const totalEarned = confirmedTxs.reduce(
    (sum, tx) => sum + tx.teacher_amount,
    0
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = confirmedTxs
    .filter((tx) => new Date(tx.created_at) >= startOfMonth)
    .reduce((sum, tx) => sum + tx.teacher_amount, 0);

  // Pending payout = confirmed transactions minus already paid out
  const { data: payouts } = await supabase
    .from("teacher_payouts")
    .select("amount_xof")
    .eq("teacher_id", user.id)
    .eq("status", "completed");

  const totalPaidOut = (payouts ?? []).reduce(
    (sum, p) => sum + p.amount_xof,
    0
  );
  const pendingPayout = totalEarned - totalPaidOut;

  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-8 flex items-center gap-3">
        <Wallet className="size-7 text-[var(--ev-blue)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      <EarningsDashboard
        totalEarned={totalEarned}
        thisMonth={thisMonth}
        pendingPayout={Math.max(0, pendingPayout)}
        transactions={enriched}
      />
    </div>
  );
}
