import { describe, it, expect } from "vitest";
import { convertToXof, verifyFlutterwaveWebhook } from "@/lib/payments/flutterwave";

describe("Flutterwave helpers", () => {
  describe("convertToXof", () => {
    it("returns XOF amount unchanged (rounded to integer)", () => {
      expect(convertToXof(5000, "XOF")).toBe(5000);
    });

    it("rounds XOF floats to nearest integer", () => {
      expect(convertToXof(5000.7, "XOF")).toBe(5001);
    });

    it("converts EUR to XOF at fixed peg rate (655.957)", () => {
      // 100 EUR × 655.957 = 65595.7 → 65596
      expect(convertToXof(100, "EUR")).toBe(65596);
    });

    it("converts 1 EUR correctly", () => {
      expect(convertToXof(1, "EUR")).toBe(656);
    });

    it("converts USD to XOF at approximate market rate", () => {
      // 100 USD × 605 = 60500
      expect(convertToXof(100, "USD")).toBe(60500);
    });

    it("handles case-insensitive currency codes", () => {
      expect(convertToXof(10, "eur")).toBe(convertToXof(10, "EUR"));
      expect(convertToXof(10, "usd")).toBe(convertToXof(10, "USD"));
    });

    it("throws on unsupported currency", () => {
      expect(() => convertToXof(100, "GBP")).toThrow("Unsupported currency: GBP");
    });

    it("handles zero amount", () => {
      expect(convertToXof(0, "EUR")).toBe(0);
    });
  });

  describe("verifyFlutterwaveWebhook", () => {
    it("returns false when signature is null", () => {
      expect(verifyFlutterwaveWebhook(null)).toBe(false);
    });

    it("returns false when FLUTTERWAVE_SECRET_HASH is not set", () => {
      const original = process.env.FLUTTERWAVE_SECRET_HASH;
      delete process.env.FLUTTERWAVE_SECRET_HASH;
      expect(verifyFlutterwaveWebhook("some-hash")).toBe(false);
      if (original) process.env.FLUTTERWAVE_SECRET_HASH = original;
    });

    it("returns true when signature matches secret hash", () => {
      process.env.FLUTTERWAVE_SECRET_HASH = "test-secret-hash";
      expect(verifyFlutterwaveWebhook("test-secret-hash")).toBe(true);
      delete process.env.FLUTTERWAVE_SECRET_HASH;
    });

    it("returns false when signature does not match", () => {
      process.env.FLUTTERWAVE_SECRET_HASH = "correct-hash";
      expect(verifyFlutterwaveWebhook("wrong-hash")).toBe(false);
      delete process.env.FLUTTERWAVE_SECRET_HASH;
    });
  });
});
