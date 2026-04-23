import { describe, it, expect } from "vitest";
import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("i18n message parity", () => {
  const frKeys = getKeys(fr);
  const enKeys = getKeys(en);

  it("French and English have the same number of keys", () => {
    expect(frKeys.length).toBe(enKeys.length);
  });

  it("every French key exists in English", () => {
    const missingInEn = frKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it("every English key exists in French", () => {
    const missingInFr = enKeys.filter((k) => !frKeys.includes(k));
    expect(missingInFr).toEqual([]);
  });

  it("no empty string values in French (source of truth)", () => {
    const emptyKeys = frKeys.filter((key) => {
      const value = key.split(".").reduce((obj: Record<string, unknown>, k: string) => (obj as Record<string, unknown>)?.[k], fr as Record<string, unknown>);
      return value === "";
    });
    expect(emptyKeys).toEqual([]);
  });

  it("no empty string values in English", () => {
    const emptyKeys = enKeys.filter((key) => {
      const value = key.split(".").reduce((obj: Record<string, unknown>, k: string) => (obj as Record<string, unknown>)?.[k], en as Record<string, unknown>);
      return value === "";
    });
    expect(emptyKeys).toEqual([]);
  });

  it("French is the default locale in config", async () => {
    const config = await import("@/i18n/config");
    expect(config.defaultLocale).toBe("fr");
  });

  it("both fr and en are supported locales", async () => {
    const config = await import("@/i18n/config");
    expect(config.locales).toContain("fr");
    expect(config.locales).toContain("en");
  });
});
