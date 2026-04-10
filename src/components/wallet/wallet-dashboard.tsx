"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Wallet, ArrowDownLeft, ArrowUpRight, Gift, Loader2 } from "lucide-react";

type WalletTransaction = {
  id: string;
  type: string;
  amount_xof: number;
  description: string;
  created_at: string;
};

export function WalletDashboard() {
  const t = useTranslations("wallet");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/wallet");
        const json = await res.json();
        if (json.data) {
          setBalance(json.data.balance);
          setTransactions(json.data.transactions);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-[var(--ev-blue)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-2xl border border-[var(--ev-blue)]/10 bg-gradient-to-br from-[var(--ev-blue)] to-[var(--ev-blue-dark)] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Wallet className="size-8" />
          <div>
            <p className="text-sm text-blue-200">{t("balance")}</p>
            <p className="text-3xl font-extrabold">
              {balance.toLocaleString("fr-CI")} <span className="text-lg font-normal">FCFA</span>
            </p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-900">{t("history")}</h2>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            {t("noTransactions")}
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {tx.amount_xof > 0 ? (
                    <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                      <ArrowDownLeft className="size-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-red-100">
                      <ArrowUpRight className="size-4 text-red-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString("fr-CI")}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.amount_xof > 0 ? "text-green-600" : "text-red-500"}`}>
                  {tx.amount_xof > 0 ? "+" : ""}{tx.amount_xof.toLocaleString("fr-CI")} F
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
