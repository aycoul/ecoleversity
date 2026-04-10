import crypto from "crypto";

/** Credit amount for both referrer and referred user */
export const REFERRAL_CREDIT_XOF = 1000;

/** Generate a deterministic referral code from a user ID (12 alphanumeric chars) */
export function generateReferralCode(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId).digest("base64url");
  // Take first 12 chars, uppercase — base64url gives [A-Za-z0-9_-], we uppercase for consistency
  return hash.slice(0, 12).toUpperCase().replace(/[_-]/g, "X");
}

/** Validate referral code format (8+ alphanumeric chars) */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{8,}$/.test(code);
}
