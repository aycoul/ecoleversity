import "server-only";

/**
 * Server-only PayPal helpers — anything that needs the secret lives here.
 * Pure money helpers (xofToEur / eurToXof / EUR_TO_XOF) are exported from
 * `./paypal-money` so client bundles can import them safely.
 */

import { eurToXof } from "./paypal-money";

/** Verify a PayPal order via their REST API. */
export async function verifyPaypalOrder(
  orderId: string,
): Promise<{
  success: boolean;
  amount: number;
  currency: string;
  amountXof: number;
  payerEmail: string;
  captureId: string;
}> {
  // Client ID matches the public value used client-side; secret stays env-only.
  const { getPaypalClientId } = await import("./config");
  const clientId = getPaypalClientId();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[paypal] Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
    return { success: false, amount: 0, currency: "", amountXof: 0, payerEmail: "", captureId: "" };
  }

  const baseUrl = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  try {
    const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!authRes.ok) {
      console.error("[paypal] Auth failed:", authRes.status);
      return { success: false, amount: 0, currency: "", amountXof: 0, payerEmail: "", captureId: "" };
    }
    const { access_token } = await authRes.json();

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!orderRes.ok) {
      console.error("[paypal] Order fetch failed:", orderRes.status);
      return { success: false, amount: 0, currency: "", amountXof: 0, payerEmail: "", captureId: "" };
    }
    const order = await orderRes.json();
    if (order.status !== "COMPLETED") {
      return { success: false, amount: 0, currency: "", amountXof: 0, payerEmail: "", captureId: "" };
    }

    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    // PayPal returns amount as a string like "12.34". Parse to integer
    // cents-of-EUR first to avoid float drift, then convert to XOF.
    const valueStr = String(capture?.amount?.value ?? "0");
    const cents = Math.round(parseFloat(valueStr) * 100);
    const amount = cents / 100;
    const currency = capture?.amount?.currency_code ?? "EUR";
    // EUR → XOF integer; USD fallback uses an approximate rate. Both stay integer.
    const amountXof =
      currency === "EUR"
        ? eurToXof(amount)
        : Math.round((cents * 605) / 100);

    return {
      success: true,
      amount,
      currency,
      amountXof,
      payerEmail: order.payer?.email_address ?? "",
      captureId: capture?.id ?? "",
    };
  } catch (err) {
    console.error("[paypal] Verification error:", err);
    return { success: false, amount: 0, currency: "", amountXof: 0, payerEmail: "", captureId: "" };
  }
}

// Re-export the money helpers so existing server-side imports of
// `@/lib/payments/paypal` keep working without code changes.
export { xofToEur, eurToXof, EUR_TO_XOF } from "./paypal-money";
