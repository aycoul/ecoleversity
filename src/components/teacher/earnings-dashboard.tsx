"use client";

import { useTranslations } from "next-intl";
import { Wallet, TrendingUp, Clock, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Transaction = {
  id: string;
  parentName: string;
  subject: string;
  teacherAmount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
};

type DailyEarning = {
  label: string;
  amount: number;
};

type EarningsDashboardProps = {
  totalEarned: number;
  thisMonth: number;
  pendingPayout: number;
  transactions: Transaction[];
  dailyEarnings?: DailyEarning[];
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("fr-CI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: "bg-[var(--ev-green)]/10 text-[var(--ev-blue)]",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-slate-100 text-slate-600",
  };

  const labels: Record<string, string> = {
    confirmed: "Confirmé",
    pending: "En attente",
    failed: "Échoué",
    refunded: "Remboursé",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function EarningsDashboard({
  totalEarned,
  thisMonth,
  pendingPayout,
  transactions,
  dailyEarnings,
}: EarningsDashboardProps) {
  const t = useTranslations("earnings");

  const maxDaily = Math.max(...(dailyEarnings ?? []).map((d) => d.amount), 1);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="size-4 text-[var(--ev-blue)]" />
            {t("totalEarned")}
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalEarned)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="size-4 text-blue-600" />
            {t("thisMonth")}
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(thisMonth)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="size-4 text-amber-600" />
            {t("pendingPayout")}
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingPayout)}
          </p>
        </div>
      </div>

      {/* 7-day earnings chart */}
      {dailyEarnings && dailyEarnings.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {t("last7Days") ?? "7 derniers jours"}
          </h2>
          <div className="flex items-end gap-2 h-32">
            {dailyEarnings.map((day, i) => {
              const pct = Math.round((day.amount / maxDaily) * 100);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end rounded-t-md bg-slate-100 overflow-hidden">
                    <div
                      className="w-full bg-[var(--ev-blue)] transition-all duration-500 rounded-t-md"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">{day.label}</span>
                  {day.amount > 0 && (
                    <span className="text-[10px] font-semibold text-[var(--ev-blue)]">
                      {formatCurrency(day.amount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commission info */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Info className="mt-0.5 size-4 shrink-0" />
        {t("commissionNote")}
      </div>

      {/* Transaction list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {t("transactionHistory")}
        </h2>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <Wallet className="mx-auto mb-3 size-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noTransactions")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="px-3 py-3">{t("date")}</th>
                  <th className="px-3 py-3">{t("student")}</th>
                  <th className="px-3 py-3">{t("subject")}</th>
                  <th className="px-3 py-3 text-right">{t("amount")}</th>
                  <th className="px-3 py-3 text-center">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {tx.parentName}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{tx.subject}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[var(--ev-blue)]">
                      {formatCurrency(tx.teacherAmount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
