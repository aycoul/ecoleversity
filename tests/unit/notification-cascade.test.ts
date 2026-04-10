import { describe, it, expect, vi } from "vitest";
import { isInQuietHours, shouldNotify, type NotificationPreferences } from "@/lib/notifications/cascade";

const basePrefs: NotificationPreferences = {
  whatsapp_enabled: true,
  email_enabled: true,
  push_enabled: true,
  preferred_channel: "whatsapp",
  quiet_hours_start: null,
  quiet_hours_end: null,
};

describe("notification cascade", () => {
  describe("isInQuietHours", () => {
    it("returns false when no quiet hours set", () => {
      expect(isInQuietHours(basePrefs)).toBe(false);
    });

    it("returns false when quiet_hours_start is null", () => {
      expect(isInQuietHours({ ...basePrefs, quiet_hours_start: null, quiet_hours_end: "07:00" })).toBe(false);
    });

    it("returns false when quiet_hours_end is null", () => {
      expect(isInQuietHours({ ...basePrefs, quiet_hours_start: "22:00", quiet_hours_end: null })).toBe(false);
    });

    it("detects normal range (e.g., 08:00-12:00) correctly", () => {
      const prefs = { ...basePrefs, quiet_hours_start: "08:00", quiet_hours_end: "12:00" };

      // Mock time to 10:00 GMT (Abidjan is GMT+0)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-10T10:00:00Z"));
      expect(isInQuietHours(prefs)).toBe(true);

      // Mock time to 14:00 — outside range
      vi.setSystemTime(new Date("2026-04-10T14:00:00Z"));
      expect(isInQuietHours(prefs)).toBe(false);

      vi.useRealTimers();
    });

    it("handles overnight range (e.g., 22:00-07:00)", () => {
      const prefs = { ...basePrefs, quiet_hours_start: "22:00", quiet_hours_end: "07:00" };

      vi.useFakeTimers();

      // 23:00 — in quiet hours
      vi.setSystemTime(new Date("2026-04-10T23:00:00Z"));
      expect(isInQuietHours(prefs)).toBe(true);

      // 03:00 — in quiet hours (past midnight)
      vi.setSystemTime(new Date("2026-04-11T03:00:00Z"));
      expect(isInQuietHours(prefs)).toBe(true);

      // 12:00 — not in quiet hours
      vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
      expect(isInQuietHours(prefs)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("shouldNotify", () => {
    it("always sends critical events even during quiet hours", () => {
      const prefs = { ...basePrefs, quiet_hours_start: "00:00", quiet_hours_end: "23:59" };

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

      expect(shouldNotify(prefs, "payment_confirmed")).toBe(true);
      expect(shouldNotify(prefs, "booking_confirmed")).toBe(true);
      expect(shouldNotify(prefs, "session_reminder_15min")).toBe(true);

      vi.useRealTimers();
    });

    it("blocks non-critical events during quiet hours", () => {
      const prefs = { ...basePrefs, quiet_hours_start: "00:00", quiet_hours_end: "23:59" };

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

      expect(shouldNotify(prefs, "new_message")).toBe(false);
      expect(shouldNotify(prefs, "new_review")).toBe(false);
      expect(shouldNotify(prefs, "new_follower")).toBe(false);

      vi.useRealTimers();
    });

    it("allows non-critical events outside quiet hours", () => {
      const prefs = { ...basePrefs, quiet_hours_start: "22:00", quiet_hours_end: "07:00" };

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

      expect(shouldNotify(prefs, "new_message")).toBe(true);
      expect(shouldNotify(prefs, "new_review")).toBe(true);

      vi.useRealTimers();
    });

    it("allows everything when no quiet hours set", () => {
      expect(shouldNotify(basePrefs, "new_message")).toBe(true);
      expect(shouldNotify(basePrefs, "new_follower")).toBe(true);
    });
  });
});
