/**
 * Pure money helpers for the PayPal flow. Client-safe — no server-only
 * imports, no env reads. Lives in its own module so the client bundle
 * never accidentally pulls in `verifyPaypalOrder` from `paypal.ts`.
 */

// XOF is not supported by PayPal — convert to EUR for checkout.
// CFA franc has been pegged to the euro since 1999.
export const EUR_TO_XOF = 655.957;

/** Convert FCFA amount to EUR for PayPal checkout (2-decimal string). */
export function xofToEur(amountXof: number): number {
  return Math.round((amountXof / EUR_TO_XOF) * 100) / 100;
}

/** Convert EUR back to FCFA (integer). */
export function eurToXof(amountEur: number): number {
  return Math.round(amountEur * EUR_TO_XOF);
}
