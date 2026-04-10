import { describe, it, expect } from "vitest";
import { generateCertificateId, formatCertificateDate } from "@/lib/certificate";

describe("certificate helpers", () => {
  describe("generateCertificateId", () => {
    it("starts with CERT-", () => {
      const id = generateCertificateId();
      expect(id).toMatch(/^CERT-/);
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateCertificateId()));
      expect(ids.size).toBe(100);
    });

    it("has consistent length", () => {
      const id = generateCertificateId();
      expect(id.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe("formatCertificateDate", () => {
    it("formats date in French locale", () => {
      const result = formatCertificateDate("2026-04-10T12:00:00Z");
      expect(result).toContain("2026");
      expect(result).toContain("avril");
    });

    it("formats with day and month name", () => {
      const result = formatCertificateDate("2026-01-15T00:00:00Z");
      expect(result).toContain("janvier");
      expect(result).toContain("15");
    });
  });
});
