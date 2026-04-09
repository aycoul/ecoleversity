import { describe, it, expect } from "vitest";
import { detectContactInfo } from "@/lib/contact-detector";

describe("detectContactInfo", () => {
  it("allows clean messages", () => {
    const result = detectContactInfo("Bonjour, je cherche un cours de maths");
    expect(result.isClean).toBe(true);
    expect(result.flaggedPatterns).toHaveLength(0);
  });

  it("detects Ivorian phone numbers (07 format)", () => {
    const result = detectContactInfo("Appelez-moi au 07 08 09 10 11");
    expect(result.isClean).toBe(false);
    expect(result.flaggedPatterns.length).toBeGreaterThan(0);
  });

  it("detects Ivorian phone numbers (+225 format)", () => {
    const result = detectContactInfo("Mon numero: +225 07 08 09 10 11");
    expect(result.isClean).toBe(false);
  });

  it("detects Wave/Orange numbers (05 format)", () => {
    const result = detectContactInfo("Envoyez sur 05 12 34 56 78");
    expect(result.isClean).toBe(false);
  });

  it("detects email addresses", () => {
    const result = detectContactInfo("Ecrivez a prof@gmail.com");
    expect(result.isClean).toBe(false);
    expect(result.flaggedPatterns).toContain("prof@gmail.com");
  });

  it("detects social media handles", () => {
    const result = detectContactInfo("Mon WhatsApp: konan225");
    expect(result.isClean).toBe(false);
  });

  it("detects @handles", () => {
    const result = detectContactInfo("Suivez @prof_maths sur Instagram");
    expect(result.isClean).toBe(false);
  });

  it("detects URLs", () => {
    const result = detectContactInfo("Voir https://monsite.com/cours");
    expect(result.isClean).toBe(false);
  });

  it("detects 'appelez-moi' patterns", () => {
    const result = detectContactInfo("appelez-moi après le cours");
    expect(result.isClean).toBe(false);
  });

  it("detects 'mon numéro' patterns", () => {
    const result = detectContactInfo("mon numéro c'est le...");
    expect(result.isClean).toBe(false);
  });

  it("sanitizes detected content", () => {
    const result = detectContactInfo("Contactez prof@gmail.com pour plus");
    expect(result.sanitizedContent).toContain("[contenu bloqué]");
    expect(result.sanitizedContent).not.toContain("prof@gmail.com");
  });

  it("preserves clean content in sanitized output", () => {
    const result = detectContactInfo("Bonjour le cours est bien");
    expect(result.sanitizedContent).toBe("Bonjour le cours est bien");
  });
});
