import crypto from "crypto";

// EUR→FCFA is fixed (CFA franc pegged to Euro since 1999)
const EUR_TO_XOF = 655.957;
// USD→FCFA uses approximate market rate (updated periodically)
const USD_TO_XOF = 605;

/** Convert foreign currency amount to FCFA (integer) */
export function convertToXof(amount: number, currency: string): number {
  switch (currency.toUpperCase()) {
    case "XOF":
      return Math.round(amount);
    case "EUR":
      return Math.round(amount * EUR_TO_XOF);
    case "USD":
      return Math.round(amount * USD_TO_XOF);
    default:
      throw new Error(`Unsupported currency: ${currency}`);
  }
}

/** Verify a Flutterwave payment via their API */
export async function verifyFlutterwavePayment(
  flutterwaveTransactionId: string,
): Promise<{
  success: boolean;
  amount: number;
  currency: string;
  amountXof: number;
  customerEmail: string;
  txRef: string;
}> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLUTTERWAVE_SECRET_KEY not configured");
  }

  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/${flutterwaveTransactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("[flutterwave] Verification failed:", res.status, body);
    return { success: false, amount: 0, currency: "", amountXof: 0, customerEmail: "", txRef: "" };
  }

  const json = await res.json();
  const data = json.data;

  if (data.status !== "successful") {
    return { success: false, amount: 0, currency: "", amountXof: 0, customerEmail: "", txRef: "" };
  }

  const amountXof = convertToXof(data.amount, data.currency);

  return {
    success: true,
    amount: data.amount,
    currency: data.currency,
    amountXof,
    customerEmail: data.customer?.email ?? "",
    txRef: data.tx_ref ?? "",
  };
}

/** Verify Flutterwave webhook signature */
export function verifyFlutterwaveWebhook(
  signature: string | null,
): boolean {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash || !signature) return false;
  const sigBuf = Buffer.from(signature);
  const hashBuf = Buffer.from(secretHash);
  if (sigBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, hashBuf);
}
