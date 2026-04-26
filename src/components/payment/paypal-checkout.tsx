"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { xofToEur } from "@/lib/payments/paypal-money";
import { getPaypalClientId } from "@/lib/payments/config";

type PaypalCheckoutProps = {
  paymentReference: string;
  amountXof: number;
  teacherName: string;
  onSuccess: () => void;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (selector: string) => void };
    };
  }
}

export function PaypalCheckout({
  paymentReference,
  amountXof,
  teacherName,
  onSuccess,
}: PaypalCheckoutProps) {
  const t = useTranslations("payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const clientId = getPaypalClientId();
  const amountEur = xofToEur(amountXof);

  // Load PayPal SDK
  useEffect(() => {
    if (!clientId || window.paypal) {
      if (window.paypal) setSdkReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError(t("cardError"));
    document.head.appendChild(script);
  }, [clientId, t]);

  // Render PayPal buttons when SDK ready
  useEffect(() => {
    if (!sdkReady || !window.paypal) return;

    const container = document.getElementById("paypal-button-container");
    if (!container || container.childNodes.length > 0) return;

    window.paypal.Buttons({
      style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" },
      createOrder: (_data: unknown, actions: { order: { create: (opts: Record<string, unknown>) => Promise<string> } }) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: amountEur.toFixed(2), currency_code: "EUR" },
            description: `écoleVersity — ${teacherName} (${paymentReference})`,
            custom_id: paymentReference,
          }],
        });
      },
      onApprove: async (_data: { orderID: string }, actions: { order: { capture: () => Promise<unknown> } }) => {
        setLoading(true);
        try {
          await actions.order.capture();

          // Verify with our backend
          const res = await fetch("/api/payments/paypal-capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: _data.orderID,
              paymentReference,
            }),
          });

          const json = await res.json();
          if (json.data?.status === "confirmed" || json.data?.status === "already_confirmed") {
            onSuccess();
          } else {
            setError(json.error ?? t("cardError"));
          }
        } catch {
          setError(t("cardError"));
        } finally {
          setLoading(false);
        }
      },
      onError: () => {
        setError(t("cardError"));
      },
    }).render("#paypal-button-container");
  }, [sdkReady, amountEur, paymentReference, teacherName, onSuccess, t]);

  if (!clientId) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard className="size-5 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">
          {t("payByCard")}
        </span>
      </div>

      <p className="mb-3 text-xs text-blue-700">
        {t("cardSubtitle")}
      </p>

      <p className="mb-3 text-sm font-medium text-blue-900">
        {amountEur.toFixed(2)} EUR ({amountXof.toLocaleString("fr-CI")} FCFA)
      </p>

      {error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-6 animate-spin text-blue-600" />
        </div>
      )}

      <div id="paypal-button-container" />
    </div>
  );
}
