"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

type FlutterwaveCheckoutProps = {
  paymentReference: string;
  amountXof: number;
  customerEmail: string;
  customerName: string;
  teacherName: string;
  onSuccess: () => void;
};

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => void;
  }
}

function loadFlutterwaveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Flutterwave"));
    document.head.appendChild(script);
  });
}

export function FlutterwaveCheckout({
  paymentReference,
  amountXof,
  customerEmail,
  customerName,
  teacherName,
  onSuccess,
}: FlutterwaveCheckoutProps) {
  const t = useTranslations("payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;

  const handlePayByCard = useCallback(async () => {
    if (!publicKey) {
      setError(t("cardNotAvailable"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loadFlutterwaveScript();

      window.FlutterwaveCheckout?.({
        public_key: publicKey,
        tx_ref: paymentReference,
        amount: amountXof,
        currency: "XOF",
        payment_options: "card",
        customer: {
          email: customerEmail,
          name: customerName,
        },
        customizations: {
          title: "écoleVersity",
          description: t("cardDescription", { teacher: teacherName }),
          logo: `${window.location.origin}/logo.png`,
        },
        callback: (response: { status: string; transaction_id: number }) => {
          if (response.status === "successful") {
            onSuccess();
          }
          setLoading(false);
        },
        onclose: () => {
          setLoading(false);
        },
      });
    } catch {
      setError(t("cardError"));
      setLoading(false);
    }
  }, [publicKey, paymentReference, amountXof, customerEmail, customerName, teacherName, onSuccess, t]);

  if (!publicKey) return null;

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard className="size-5 text-purple-600" />
        <span className="text-sm font-semibold text-purple-800">
          {t("payByCard")}
        </span>
      </div>

      <p className="mb-3 text-xs text-purple-700">
        {t("cardSubtitle")}
      </p>

      {error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

      <Button
        onClick={handlePayByCard}
        disabled={loading}
        className="w-full bg-purple-600 text-white hover:bg-purple-700"
      >
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 size-4" />
        )}
        {t("payCardButton", { amount: amountXof.toLocaleString("fr-CI") })}
      </Button>
    </div>
  );
}
