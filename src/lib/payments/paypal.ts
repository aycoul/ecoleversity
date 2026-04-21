/**
 * PayPal payment helpers for diaspora credit card payments.
 * Uses PayPal REST API for order verification.
 * Bootstrap phase: personal PayPal account, no business registration needed.
 */

// XOF is not supported by PayPal — convert to EUR for checkout
// EUR→FCFA fixed peg rate (CFA franc pegged to Euro since 1999)
const EUR_TO_XOF = 655.957;

/** Convert FCFA amount to EUR for PayPal checkout */
export function xofToEur(amountXof: number): number {
  return Math.round((amountXof / EUR_TO_XOF) * 100) / 100;
}

/** Convert EUR back to FCFA */
export function eurToXof(amountEur: number): number {
  return Math.round(amountEur * EUR_TO_XOF);
}

/** Verify a PayPal order via their API */
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
  // Client ID is the same value used client-side (public), so we reuse
  // the config helper with its hardcoded fallback. Secret stays env-only.
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
    // Get access token
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

    // Get order details
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
    const amount = parseFloat(capture?.amount?.value ?? "0");
    const currency = capture?.amount?.currency_code ?? "EUR";
    const amountXof = currency === "EUR" ? eurToXof(amount) : Math.round(amount * 605); // USD fallback

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
