import { describe, it, expect } from "vitest";
import { xofToEur, eurToXof } from "@/lib/payments/paypal";

describe("PayPal payment helpers", () => {
  describe("xofToEur", () => {
    it("converts FCFA to EUR at fixed peg rate", () => {
      // 655.957 XOF = 1 EUR
      expect(xofToEur(65596)).toBeCloseTo(100, 0);
    });

    it("converts small amounts correctly", () => {
      expect(xofToEur(656)).toBeCloseTo(1, 0);
    });

    it("converts 2000 FCFA (30min session) to EUR", () => {
      const eur = xofToEur(2000);
      expect(eur).toBeCloseTo(3.05, 1);
    });

    it("converts 3500 FCFA (60min session) to EUR", () => {
      const eur = xofToEur(3500);
      expect(eur).toBeCloseTo(5.34, 1);
    });

    it("returns 0 for 0", () => {
      expect(xofToEur(0)).toBe(0);
    });

    it("rounds to 2 decimal places", () => {
      const eur = xofToEur(1000);
      expect(eur.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
    });
  });

  describe("eurToXof", () => {
    it("converts EUR to FCFA at fixed peg rate", () => {
      expect(eurToXof(100)).toBe(65596);
    });

    it("converts 1 EUR", () => {
      expect(eurToXof(1)).toBe(656);
    });

    it("roundtrips approximately", () => {
      const original = 5000;
      const eur = xofToEur(original);
      const backToXof = eurToXof(eur);
      // Allow ±5 FCFA rounding error (EUR rounds to 2 decimal places)
      expect(Math.abs(backToXof - original)).toBeLessThanOrEqual(5);
    });

    it("returns 0 for 0", () => {
      expect(eurToXof(0)).toBe(0);
    });
  });
});
