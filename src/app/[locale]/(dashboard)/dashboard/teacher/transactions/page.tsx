import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("fr-CI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
};

export default async function TeacherTransactionsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("transactions");

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
    redirect("/dashboard");
  }

  // Fetch teacher's transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      "id, amount_xof, teacher_amount, commission_amount, status, created_at, parent_id"
    )
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Enrich with parent names
  const enriched = await Promise.all(
    (transactions ?? []).map(async (tx) => {
      const { data: parentProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", tx.parent_id)
        .single();

      return {
        ...tx,
        parentName: parentProfile?.display_name ?? "—",
      };
    })
  );

  const statusLabel = (status: string): string => {
    const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}` as
      | "statusPending"
      | "statusConfirmed"
      | "statusFailed"
      | "statusRefunded";
    return t(key);
  };

  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-8 flex items-center gap-3">
        <Receipt className="size-7 text-emerald-600" />
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      {enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <Receipt className="mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t("noTransactions")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="px-3 py-3">{t("date")}</th>
                <th className="px-3 py-3">{t("parent")}</th>
                <th className="px-3 py-3 text-right">{t("amount")}</th>
                <th className="px-3 py-3 text-right">{t("commission")}</th>
                <th className="px-3 py-3 text-center">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">
                    {tx.parentName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-emerald-700">
                    {formatCurrency(tx.teacher_amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-500">
                    {formatCurrency(tx.commission_amount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[tx.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {statusLabel(tx.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
