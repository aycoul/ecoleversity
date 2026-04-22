"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Wallet,
  TrendingUp,
  Clock,
  Info,
  Banknote,
  Edit3,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock4,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

type PayoutRecord = {
  id: string;
  amount_xof: number;
  status: string;
  provider: string;
  payout_phone: string;
  created_at: string;
  processed_at: string | null;
};

type EarningsDashboardProps = {
  totalEarned: number;
  thisMonth: number;
  pendingPayout: number;
  transactions: Transaction[];
  dailyEarnings?: DailyEarning[];
  payoutHistory: PayoutRecord[];
  payoutPhone: string | null;
  payoutProvider: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN MoMo",
  wallet: "Portefeuille",
  manual: "Manuel",
};

const PAYOUT_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700", icon: Clock4 },
  processing: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  completed: { label: "Payé", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  failed: { label: "Échoué", color: "bg-red-100 text-red-700", icon: XCircle },
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

function PayoutStatusBadge({ status }: { status: string }) {
  const meta = PAYOUT_STATUS[status] ?? PAYOUT_STATUS.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

export function EarningsDashboard({
  totalEarned,
  thisMonth,
  pendingPayout,
  transactions,
  dailyEarnings,
  payoutHistory,
  payoutPhone,
  payoutProvider,
}: EarningsDashboardProps) {
  const t = useTranslations("earnings");
  const [requesting, setRequesting] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [localPhone, setLocalPhone] = useState(payoutPhone ?? "");
  const [localProvider, setLocalProvider] = useState(payoutProvider ?? "orange_money");

  const maxDaily = Math.max(...(dailyEarnings ?? []).map((d) => d.amount), 1);

  const handleRequestPayout = useCallback(async () => {
    setRequesting(true);
    try {
      const res = await fetch("/api/teacher/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(t("payoutRequested", { amount: formatCurrency(data.amount) }));
        window.location.reload();
      } else {
        toast.error(data.error || t("payoutRequestFailed"));
      }
    } finally {
      setRequesting(false);
    }
  }, [t]);

  const handleSaveInfo = useCallback(async () => {
    setSavingInfo(true);
    try {
      const res = await fetch("/api/teacher/payout-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_phone: localPhone,
          payout_provider: localProvider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(t("payoutInfoSaved"));
        setEditingInfo(false);
        window.location.reload();
      } else {
        toast.error(data.error || t("payoutInfoSaveFailed"));
      }
    } finally {
      setSavingInfo(false);
    }
  }, [localPhone, localProvider, t]);

  const hasPayoutMethod = !!payoutPhone && !!payoutProvider;
  const pendingRequests = payoutHistory.filter((p) => p.status === "pending" || p.status === "processing");

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

      {/* Payout action + info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Banknote className="size-4 text-[var(--ev-blue)]" />
              {t("payoutMethod")}
            </h2>
            {hasPayoutMethod && !editingInfo ? (
              <div className="mt-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium">{PROVIDER_LABELS[payoutProvider!]}</span>{" "}
                  · {payoutPhone}
                </p>
              </div>
            ) : !editingInfo ? (
              <p className="mt-2 text-sm text-amber-600">{t("noPayoutMethod")}</p>
            ) : null}

            {/* Status helper — always visible when not editing */}
            {!editingInfo && (
              <div className="mt-3 space-y-1">
                {!hasPayoutMethod && (
                  <p className="text-xs text-amber-600">
                    {t("configurePayoutToRequest")}
                  </p>
                )}
                {hasPayoutMethod && pendingPayout < 5000 && (
                  <p className="text-xs text-slate-500">
                    {t("minPayoutNotReached", { amount: formatCurrency(5000), remaining: formatCurrency(Math.max(0, 5000 - pendingPayout)) })}
                  </p>
                )}
                {hasPayoutMethod && pendingPayout >= 5000 && pendingRequests.length > 0 && (
                  <p className="text-xs text-amber-600">
                    {t("payoutAlreadyPending")}
                  </p>
                )}
                {hasPayoutMethod && pendingPayout >= 5000 && pendingRequests.length === 0 && (
                  <p className="text-xs text-green-600">
                    {t("readyToWithdraw")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!editingInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingInfo(true)}
                className="gap-1.5"
              >
                <Edit3 className="size-3.5" />
                {hasPayoutMethod ? t("edit") : t("addPayoutMethod")}
              </Button>
            )}
            {!editingInfo && (
              <Button
                size="sm"
                onClick={handleRequestPayout}
                disabled={
                  requesting ||
                  !hasPayoutMethod ||
                  pendingPayout < 5000 ||
                  pendingRequests.length > 0
                }
                className="gap-1.5 bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)] disabled:opacity-50"
              >
                {requesting && <Loader2 className="size-3.5 animate-spin" />}
                {t("requestPayout")}
              </Button>
            )}
          </div>
        </div>

        {editingInfo && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("providerLabel")}
                </label>
                <select
                  value={localProvider}
                  onChange={(e) => setLocalProvider(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--ev-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--ev-blue)]"
                >
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                  <option value="mtn_momo">MTN MoMo</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("phoneLabel")}
                </label>
                <input
                  type="tel"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  placeholder="07 XX XX XX XX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--ev-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--ev-blue)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveInfo}
                disabled={savingInfo || !localPhone}
                className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
              >
                {savingInfo && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                {t("save")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingInfo(false);
                  setLocalPhone(payoutPhone ?? "");
                  setLocalProvider(payoutProvider ?? "orange_money");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
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

      {/* Payout history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {t("payoutHistory")}
        </h2>
        {payoutHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <Banknote className="mx-auto mb-3 size-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noPayoutsYet")}</p>
            <p className="mt-1 text-xs text-slate-400">{t("noPayoutsHelper")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="px-3 py-3">{t("date")}</th>
                  <th className="px-3 py-3">{t("method")}</th>
                  <th className="px-3 py-3">{t("phone")}</th>
                  <th className="px-3 py-3 text-right">{t("amount")}</th>
                  <th className="px-3 py-3 text-center">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {PROVIDER_LABELS[p.provider] ?? p.provider}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{p.payout_phone}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[var(--ev-blue)]">
                      {formatCurrency(p.amount_xof)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <PayoutStatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
