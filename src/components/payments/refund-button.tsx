"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

interface RefundButtonProps {
  transactionId: string;
  status: string;
  alreadyRequested?: boolean;
  isPast?: boolean;
}

export function RefundButton({
  transactionId,
  status,
  alreadyRequested,
  isPast,
}: RefundButtonProps) {
  const t = useTranslations("refund");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "refunded" || status === "partially_refunded") {
    return (
      <span className="text-xs text-slate-400">{t("alreadyRefunded")}</span>
    );
  }

  if (alreadyRequested) {
    return (
      <span className="text-xs text-amber-600">{t("requestPending")}</span>
    );
  }

  if (isPast) {
    return <span className="text-xs text-slate-400">{t("classCompleted")}</span>;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? t("error"));
        setLoading(false);
        return;
      }

      toast.success(t("requested", { amount: data.amount }));
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error(t("error"));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
      >
        <RotateCcw className="size-3" />
        {t("request")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{t("title")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("description")}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("reason")}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[var(--ev-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--ev-blue)]"
                  placeholder={t("reasonPlaceholder")}
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                {t("policyNote")}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                {t("submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
