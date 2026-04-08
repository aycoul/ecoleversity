"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Wallet, Phone, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_PROVIDER_LABELS, type PaymentProvider } from "@/types/domain";

type TeacherPayout = {
  teacherId: string;
  teacherName: string;
  payoutPhone: string;
  payoutProvider: string;
  pendingAmount: number;
};

type PayoutProcessorProps = {
  teachers: TeacherPayout[];
};

export function PayoutProcessor({ teachers }: PayoutProcessorProps) {
  const t = useTranslations("payout");
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [paid, setPaid] = useState<Set<string>>(new Set());

  async function handleMarkPaid(teacher: TeacherPayout) {
    setProcessing(teacher.teacherId);

    try {
      const now = new Date();
      const periodEnd = now.toISOString();
      const periodStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      const res = await fetch("/api/admin/process-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.teacherId,
          amountXof: teacher.pendingAmount,
          periodStart,
          periodEnd,
        }),
      });

      if (res.ok) {
        setPaid((prev) => new Set([...prev, teacher.teacherId]));
        toast.success(t("paid"));
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erreur");
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setProcessing(null);
    }
  }

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
        <CheckCircle2 className="mb-4 size-12 text-slate-300" />
        <p className="text-sm text-slate-500">{t("noPending")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teachers.map((teacher) => {
        const isPaid = paid.has(teacher.teacherId);
        const isProcessing = processing === teacher.teacherId;
        const providerLabel =
          PAYMENT_PROVIDER_LABELS[
            teacher.payoutProvider as PaymentProvider
          ] ?? teacher.payoutProvider;

        return (
          <div
            key={teacher.teacherId}
            className={`rounded-xl border p-5 transition-colors ${
              isPaid
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  {teacher.teacherName}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {t("payoutPhone")}: {teacher.payoutPhone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="size-3" />
                    {t("provider")}: {providerLabel}
                  </span>
                </div>
                <p className="text-lg font-bold text-emerald-700">
                  {formatCurrency(teacher.pendingAmount)}
                </p>
              </div>

              <div className="shrink-0">
                {isPaid ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" />
                    {t("paid")}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleMarkPaid(teacher)}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isProcessing && (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    )}
                    {t("markPaid")}
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
