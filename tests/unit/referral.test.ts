import { describe, it, expect } from "vitest";
import { generateReferralCode, isValidReferralCode, REFERRAL_CREDIT_XOF } from "@/lib/referral";

describe("referral system", () => {
  describe("generateReferralCode", () => {
    it("generates a code from user ID", () => {
      const code = generateReferralCode("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThanOrEqual(6);
    });

    it("generates consistent codes for same user", () => {
      const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      expect(generateReferralCode(id)).toBe(generateReferralCode(id));
    });

    it("generates different codes for different users", () => {
      const code1 = generateReferralCode("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
      const code2 = generateReferralCode("11111111-2222-3333-4444-555555555555");
      expect(code1).not.toBe(code2);
    });

    it("generates uppercase alphanumeric codes", () => {
      const code = generateReferralCode("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe("isValidReferralCode", () => {
    it("accepts valid 6+ char alphanumeric codes", () => {
      expect(isValidReferralCode("ABC123")).toBe(true);
      expect(isValidReferralCode("EVREF7X")).toBe(true);
    });

    it("rejects empty strings", () => {
      expect(isValidReferralCode("")).toBe(false);
    });

    it("rejects too-short codes", () => {
      expect(isValidReferralCode("AB")).toBe(false);
    });

    it("rejects codes with special characters", () => {
      expect(isValidReferralCode("ABC-123")).toBe(false);
      expect(isValidReferralCode("abc@123")).toBe(false);
    });
  });

  describe("REFERRAL_CREDIT_XOF", () => {
    it("is 1000 FCFA", () => {
      expect(REFERRAL_CREDIT_XOF).toBe(1000);
    });
  });
});
