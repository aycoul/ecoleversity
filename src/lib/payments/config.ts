/**
 * Public payment config — these values end up in the client bundle
 * and are meant to be visible to every parent on the payment page.
 *
 * The Orange Money / Wave numbers are printed on every payment QR.
 * The PayPal client ID is loaded by the browser to mount the PayPal
 * buttons. None of these are secrets.
 *
 * Env vars take precedence so we can rotate without a code push, but
 * hardcoded defaults keep the flow working even when Vercel env is
 * misconfigured — a silent blank payment page is worse than a slightly
 * stale number.
 *
 * The PayPal CLIENT SECRET does NOT live here — it stays in
 * PAYPAL_CLIENT_SECRET (no NEXT_PUBLIC_ prefix, server-only).
 */

const DEFAULT_ORANGE_MONEY_NUMBER = "+225 07 18 30 60 55";
const DEFAULT_WAVE_NUMBER = "+225 07 18 30 60 55";
const DEFAULT_PAYPAL_CLIENT_ID =
  "ATO7jERbIDhHJBAcBjD5LHuQhqJpNfvtLO_kx3qeJluH3NatP1hUTpBbgCUppMbuLfldd-G1AMwj4KnX";

export function getOrangeMoneyNumber(): string {
  return (
    process.env.NEXT_PUBLIC_ORANGE_MONEY_NUMBER?.trim() ||
    DEFAULT_ORANGE_MONEY_NUMBER
  );
}

export function getWaveNumber(): string {
  return (
    process.env.NEXT_PUBLIC_WAVE_NUMBER?.trim() || DEFAULT_WAVE_NUMBER
  );
}

export function getPaypalClientId(): string {
  return (
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ||
    DEFAULT_PAYPAL_CLIENT_ID
  );
}
