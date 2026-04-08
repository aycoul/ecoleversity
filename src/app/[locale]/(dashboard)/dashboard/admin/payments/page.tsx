import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PendingPayments } from "@/components/admin/pending-payments";
import { Wallet } from "lucide-react";

export default async function AdminPaymentsPage() {
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

  const t = await getTranslations("payment");

  // Fetch pending transactions with parent and teacher names
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id,
      amount_xof,
      payment_reference,
      created_at,
      parent_id,
      teacher_id
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Resolve parent and teacher names
  const enriched = await Promise.all(
    (transactions ?? []).map(async (tx) => {
      const [{ data: parentProfile }, { data: teacherProfile }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", tx.parent_id)
            .single(),
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", tx.teacher_id)
            .single(),
        ]);

      return {
        id: tx.id,
        parentName: parentProfile?.display_name ?? "—",
        teacherName: teacherProfile?.display_name ?? "—",
        amountXof: tx.amount_xof,
        paymentReference: tx.payment_reference,
        createdAt: tx.created_at,
      };
    })
  );

  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-8 flex items-center gap-3">
        <Wallet className="size-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("pendingPayments")}
          </h1>
          <p className="text-sm text-slate-500">
            {enriched.length > 0
              ? `${enriched.length} paiement(s) en attente`
              : ""}
          </p>
        </div>
      </div>

      <PendingPayments transactions={enriched} />
    </div>
  );
}
