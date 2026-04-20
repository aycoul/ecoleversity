import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("fr-CI", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Abidjan",
  });
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-[var(--ev-green)]/10 text-[var(--ev-blue)]",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
};

export default async function ParentPaymentsPage() {
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

  if (!profile || profile.role !== "parent") {
    redirect("/dashboard");
  }

  // Admin client for RLS-safe reads; parent_id filter scopes to the caller.
  const admin = createAdminClient();
  const { data: transactions } = await admin
    .from("transactions")
    .select(
      "id, amount_xof, status, payment_reference, created_at, teacher_id"
    )
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false });

  // Batch teacher display names (no N+1)
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
  const nameById = new Map(
    (teacherRows ?? []).map((p) => [
      p.id as string,
      (p.display_name as string | null) ?? "—",
    ])
  );

  const enriched = (transactions ?? []).map((tx) => ({
    ...tx,
    teacherName: nameById.get(tx.teacher_id as string) ?? "—",
  }));

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
        <Receipt className="size-7 text-[var(--ev-blue)]" />
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
                <th className="px-3 py-3">{t("teacher")}</th>
                <th className="px-3 py-3 text-right">{t("amount")}</th>
                <th className="px-3 py-3">{t("reference")}</th>
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
                    {tx.teacherName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(tx.amount_xof)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-500">
                    {tx.payment_reference ?? "—"}
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
