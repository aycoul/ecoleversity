import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  failed: "Échec",
  refunded: "Remboursé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-600",
  confirmed: "text-[var(--ev-green)]",
  failed: "text-red-500",
  refunded: "text-slate-400",
};

export default async function ParentSpendingPage() {
  const t = await getTranslations("dashboard.sidebar");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin client — RLS on transactions is strict; parent identity is
  // already verified and the filter below scopes to this parent_id.
  const admin = createAdminClient();
  const { data: transactions } = await admin
    .from("transactions")
    .select(
      "id, amount_xof, status, type, teacher_id, payment_reference, created_at"
    )
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Batch teacher display names for the rows
  const teacherIds = Array.from(
    new Set((transactions ?? []).map((tx) => tx.teacher_id as string))
  );
  const { data: teacherRows } =
    teacherIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", teacherIds)
      : { data: [] };
  const teacherName = new Map(
    (teacherRows ?? []).map((p) => [
      p.id as string,
      (p.display_name as string | null) ?? "—",
    ])
  );

  // total dépensé = sum of confirmed transactions only
  const total = (transactions ?? [])
    .filter((tx) => tx.status === "confirmed")
    .reduce((sum, tx) => sum + ((tx.amount_xof as number) ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="size-6 text-[var(--ev-blue)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("spending")}</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Total dépensé</p>
        <p className="mt-1 text-3xl font-bold text-[var(--ev-blue)]">
          {total.toLocaleString("fr-CI")} FCFA
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Somme des transactions confirmées
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Transactions récentes
          </h2>
        </div>
        {transactions && transactions.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <li
                key={tx.id as string}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Cours avec{" "}
                    {teacherName.get(tx.teacher_id as string) ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(tx.created_at as string).toLocaleDateString(
                      "fr-FR",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Africa/Abidjan",
                      }
                    )}{" "}
                    · Réf {(tx.payment_reference as string) ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {((tx.amount_xof as number) ?? 0).toLocaleString("fr-CI")}{" "}
                    FCFA
                  </p>
                  <p
                    className={`text-xs ${
                      STATUS_COLORS[tx.status as string] ?? "text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[tx.status as string] ?? tx.status}
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
