import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

export default async function ParentSpendingPage() {
  const t = await getTranslations("dashboard.sidebar");
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount_xof, status, description, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const total = (transactions ?? [])
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => sum + (tx.amount_xof ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="size-6 text-[var(--ev-blue)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("spending")}</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Total dépensé</p>
        <p className="mt-1 text-3xl font-bold text-[var(--ev-blue)]">
          {total.toLocaleString("fr-FR")} FCFA
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Transactions récentes</h2>
        </div>
        {transactions && transactions.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{tx.description ?? "Transaction"}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {(tx.amount_xof ?? 0).toLocaleString("fr-FR")} FCFA
                  </p>
                  <p className={`text-xs ${
                    tx.status === "completed" ? "text-[var(--ev-green)]" :
                    tx.status === "failed" ? "text-red-500" : "text-slate-400"
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            Aucune transaction pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
