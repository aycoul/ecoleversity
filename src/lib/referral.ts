import crypto from "crypto";

/** Credit amount for both referrer and referred user */
export const REFERRAL_CREDIT_XOF = 1000;

/** Generate a deterministic referral code from a user ID */
export function generateReferralCode(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId).digest("hex");
  // Take first 7 chars, uppercase
  return hash.slice(0, 7).toUpperCase();
}

/** Validate referral code format (6+ alphanumeric chars) */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{6,}$/.test(code);
}
