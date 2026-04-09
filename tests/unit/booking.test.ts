import { describe, it, expect } from "vitest";
import {
  generatePaymentReference,
  generateJitsiRoomId,
  calculateSessionPrice,
  calculateCommission,
} from "@/lib/booking";

describe("generatePaymentReference", () => {
  it("starts with EV- prefix", () => {
    const ref = generatePaymentReference();
    expect(ref).toMatch(/^EV-/);
  });

  it("is uppercase", () => {
    const ref = generatePaymentReference();
    expect(ref).toBe(ref.toUpperCase());
  });

  it("generates unique references", () => {
    const refs = new Set(Array.from({ length: 100 }, () => generatePaymentReference()));
    expect(refs.size).toBe(100);
  });

  it("has a reasonable length", () => {
    const ref = generatePaymentReference();
    expect(ref.length).toBeGreaterThan(8);
    expect(ref.length).toBeLessThan(30);
  });
});

describe("generateJitsiRoomId", () => {
  it("starts with ecoleversity- prefix", () => {
    const id = generateJitsiRoomId();
    expect(id).toMatch(/^ecoleversity-/);
  });

  it("generates unique room IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateJitsiRoomId()));
    expect(ids.size).toBe(50);
  });
});

describe("calculateSessionPrice", () => {
  it("charges 2000 FCFA for 30min session", () => {
    expect(calculateSessionPrice(30)).toBe(2000);
  });

  it("charges 2000 FCFA for sessions under 30min", () => {
    expect(calculateSessionPrice(15)).toBe(2000);
    expect(calculateSessionPrice(20)).toBe(2000);
  });

  it("charges 3500 FCFA for 60min session", () => {
    expect(calculateSessionPrice(60)).toBe(3500);
  });

  it("charges 3500 FCFA for sessions between 31-60min", () => {
    expect(calculateSessionPrice(45)).toBe(3500);
  });

  it("charges 5000 FCFA for sessions over 60min", () => {
    expect(calculateSessionPrice(90)).toBe(5000);
    expect(calculateSessionPrice(120)).toBe(5000);
  });

  it("returns integer values (money as integers rule)", () => {
    expect(Number.isInteger(calculateSessionPrice(30))).toBe(true);
    expect(Number.isInteger(calculateSessionPrice(60))).toBe(true);
    expect(Number.isInteger(calculateSessionPrice(90))).toBe(true);
  });
});

describe("calculateCommission", () => {
  it("calculates 20% commission by default", () => {
    const result = calculateCommission(10000);
    expect(result.commission).toBe(2000);
    expect(result.teacherAmount).toBe(8000);
  });

  it("commission + teacher amount equals total price", () => {
    const price = 3500;
    const result = calculateCommission(price);
    expect(result.commission + result.teacherAmount).toBe(price);
  });

  it("supports custom commission rates", () => {
    const result = calculateCommission(10000, 0.25);
    expect(result.commission).toBe(2500);
    expect(result.teacherAmount).toBe(7500);
  });

  it("rounds commission to integer (no fractional FCFA)", () => {
    const result = calculateCommission(3333, 0.2);
    expect(Number.isInteger(result.commission)).toBe(true);
    expect(Number.isInteger(result.teacherAmount)).toBe(true);
  });

  it("handles zero price", () => {
    const result = calculateCommission(0);
    expect(result.commission).toBe(0);
    expect(result.teacherAmount).toBe(0);
  });

  it("handles small amounts correctly", () => {
    const result = calculateCommission(100, 0.2);
    expect(result.commission).toBe(20);
    expect(result.teacherAmount).toBe(80);
  });
});
