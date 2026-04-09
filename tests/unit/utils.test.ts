import { describe, it, expect } from "vitest";
import { cn, formatCurrency } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates tailwind conflicts", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });
});

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0 FCFA");
  });

  it("formats small amounts", () => {
    expect(formatCurrency(500)).toBe("500 FCFA");
  });

  it("formats with thousand separators", () => {
    const result = formatCurrency(15000);
    // fr-CI uses non-breaking space or period as thousand separator
    expect(result).toMatch(/15.?000 FCFA/);
  });

  it("never shows decimal places (money as integers)", () => {
    const result = formatCurrency(2500);
    expect(result).not.toContain(".");
    expect(result).not.toContain(",");
    expect(result).toMatch(/2.?500 FCFA/);
  });

  it("handles large amounts", () => {
    const result = formatCurrency(1500000);
    expect(result).toContain("FCFA");
    expect(result).toMatch(/1.?500.?000/);
  });
});
