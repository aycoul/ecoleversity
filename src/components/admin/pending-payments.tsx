"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

type PendingTransaction = {
  id: string;
  parentName: string;
  teacherName: string;
  amountXof: number;
  paymentReference: string;
  createdAt: string;
};

type PendingPaymentsProps = {
  transactions: PendingTransaction[];
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("fr-CI", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PendingPayments({ transactions }: PendingPaymentsProps) {
  const t = useTranslations("payment");
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  async function handleConfirm(transactionId: string) {
    setConfirming(transactionId);

    try {
      const res = await fetch("/api/payments/admin-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });

      if (res.ok) {
        setConfirmed((prev) => new Set([...prev, transactionId]));
        router.refresh();
      }
    } catch {
      // Error handling — could add toast
    } finally {
      setConfirming(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
        <CheckCircle2 className="mb-4 size-12 text-slate-300" />
        <p className="text-sm text-slate-500">{t("noPendingPayments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const isConfirmed = confirmed.has(tx.id);
        const isConfirming = confirming === tx.id;

        return (
          <div
            key={tx.id}
            className={`rounded-xl border p-4 transition-colors ${
              isConfirmed
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {tx.parentName}
                  </span>
                  <span className="text-xs text-slate-400">→</span>
                  <span className="text-sm text-slate-600">
                    {tx.teacherName}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-mono font-medium text-slate-700">
                    {tx.paymentReference}
                  </span>
                  <span>{formatDate(tx.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  {tx.amountXof.toLocaleString("fr-CI")} FCFA
                </p>
              </div>

              <div className="shrink-0">
                {isConfirmed ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" />
                    {t("confirmed")}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(tx.id)}
                    disabled={isConfirming}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isConfirming && (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    )}
                    {t("adminConfirm")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
