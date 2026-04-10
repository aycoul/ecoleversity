"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PaypalCheckout } from "./paypal-checkout";

type PaymentInstructionsProps = {
  transactionId: string;
  paymentReference: string;
  amountXof: number;
  teacherName: string;
  scheduledAt: string;
  durationMinutes: number;
  createdAt: string;
};

const EXPIRY_HOURS = 2;
const POLL_INTERVAL_MS = 15_000;

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-CI", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }) + ", " + d.toLocaleTimeString("fr-CI", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEndTime(isoString: string, durationMinutes: number): string {
  const d = new Date(isoString);
  const end = new Date(d.getTime() + durationMinutes * 60 * 1000);
  return end.toLocaleTimeString("fr-CI", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("payment");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 active:bg-slate-100"
    >
      {copied ? (
        <>
          <Check className="size-3 text-[var(--ev-blue)]" />
          <span className="text-[var(--ev-blue)]">{t("copied")}</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function useCountdown(expiresAt: Date) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function update() {
      const now = Date.now();
      const diff = expiresAt.getTime() - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes.toString().padStart(2, "0")}min`);
      } else {
        setTimeLeft(
          `${minutes}:${seconds.toString().padStart(2, "0")}`
        );
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, isExpired };
}

export function PaymentInstructions({
  transactionId,
  paymentReference,
  amountXof,
  teacherName,
  scheduledAt,
  durationMinutes,
  createdAt,
}: PaymentInstructionsProps) {
  const t = useTranslations("payment");
  const router = useRouter();

  const [status, setStatus] = useState<"pending" | "confirmed" | "failed">(
    "pending"
  );
  const [isChecking, setIsChecking] = useState(false);

  const expiresAt = new Date(
    new Date(createdAt).getTime() + EXPIRY_HOURS * 60 * 60 * 1000
  );
  const { timeLeft, isExpired } = useCountdown(expiresAt);

  const orangeNumber = process.env.NEXT_PUBLIC_ORANGE_MONEY_NUMBER ?? "";
  const waveNumber = process.env.NEXT_PUBLIC_WAVE_NUMBER ?? "";

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/status/${transactionId}`);
      if (!res.ok) return;

      const json = await res.json();
      const newStatus = json.data?.status;

      if (newStatus === "confirmed") {
        setStatus("confirmed");
      } else if (newStatus === "failed") {
        setStatus("failed");
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [transactionId]);

  // Auto-poll every 15 seconds
  useEffect(() => {
    if (status !== "pending" || isExpired) return;

    const interval = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status, isExpired, checkStatus]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkStatus();
    setIsChecking(false);
  };

  const formattedAmount = amountXof.toLocaleString("fr-CI");
  const sessionTime = formatDateTime(scheduledAt);
  const endTime = formatEndTime(scheduledAt, durationMinutes);

  // Confirmed state
  if (status === "confirmed") {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-8">
        <div className="flex flex-col items-center rounded-2xl border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] p-8 text-center">
          <CheckCircle2 className="mb-4 size-16 text-[var(--ev-green)]" />
          <h2 className="text-xl font-bold text-[var(--ev-blue)]">
            {t("confirmed")}
          </h2>
          <p className="mt-2 text-sm text-[var(--ev-blue)]">
            {t("confirmedMessage")}
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="mt-6 bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
          >
            {t("goToSession")}
          </Button>
        </div>
      </div>
    );
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-8">
        <div className="flex flex-col items-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertTriangle className="mb-4 size-16 text-amber-500" />
          <h2 className="text-xl font-bold text-amber-800">
            {t("expired")}
          </h2>
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="mt-6"
          >
            {t("goToSession")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-amber-100">
          <Clock className="size-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      {/* Session summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">
          {t("sessionWith", { teacher: teacherName })}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {sessionTime} - {endTime}
        </p>
        <p className="mt-2 text-lg font-bold text-[var(--ev-blue)]">
          {formattedAmount} FCFA
        </p>
      </div>

      {/* Instructions */}
      <p className="text-sm text-slate-600">
        {t("instructions", { amount: formattedAmount })}
      </p>

      {/* Orange Money */}
      {orangeNumber && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🟠</span>
            <span className="text-sm font-semibold text-orange-800">
              {t("orangeMoney")}
            </span>
          </div>
          <p className="mb-2 font-mono text-lg font-bold text-orange-900">
            {orangeNumber}
          </p>
          <CopyButton text={orangeNumber} label={t("copyNumber")} />
        </div>
      )}

      {/* Wave */}
      {waveNumber && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🔵</span>
            <span className="text-sm font-semibold text-blue-800">
              {t("wave")}
            </span>
          </div>
          <p className="mb-2 font-mono text-lg font-bold text-blue-900">
            {waveNumber}
          </p>
          <CopyButton text={waveNumber} label={t("copyNumber")} />
        </div>
      )}

      {/* PayPal (diaspora credit cards) */}
      <PaypalCheckout
        paymentReference={paymentReference}
        amountXof={amountXof}
        teacherName={teacherName}
        onSuccess={() => setStatus("confirmed")}
      />

      {/* Reference */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {t("referenceLabel")}
          </span>
        </div>
        <p className="mb-2 font-mono text-lg font-bold tracking-wide text-amber-900">
          {paymentReference}
        </p>
        <CopyButton text={paymentReference} label={t("copyReference")} />
      </div>

      {/* Auto-confirm message */}
      <p className="text-center text-sm text-slate-500">
        {t("autoConfirmMessage")}
      </p>

      {/* Countdown timer */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
        <Clock className="size-4" />
        <span>{t("expires", { time: timeLeft })}</span>
      </div>

      {/* Polling status */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          <span>{t("waiting")}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleManualCheck}
          disabled={isChecking}
        >
          {isChecking && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("checkStatus")}
        </Button>
      </div>
    </div>
  );
}
