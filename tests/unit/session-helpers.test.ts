// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getLiveKitUrl, getRoomName, generateAccessToken } from "@/lib/video/livekit";

describe("LiveKit helpers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_LIVEKIT_URL = "wss://test.livekit.cloud";
    process.env.LIVEKIT_API_KEY = "APItest123";
    process.env.LIVEKIT_API_SECRET = "secrettest_MlZnEws77edVxJMCjm28QtHmudkgdS0L";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getLiveKitUrl", () => {
    it("returns the configured URL", () => {
      expect(getLiveKitUrl()).toBe("wss://test.livekit.cloud");
    });

    it("throws if NEXT_PUBLIC_LIVEKIT_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
      expect(() => getLiveKitUrl()).toThrow(/NEXT_PUBLIC_LIVEKIT_URL/);
    });
  });

  describe("getRoomName", () => {
    it("prefixes the live class id", () => {
      expect(getRoomName("abc-123")).toBe("session-abc-123");
    });

    it("returns a stable name for the same class id", () => {
      const id = "4e4d87e0-0000-4000-8000-000000000000";
      expect(getRoomName(id)).toBe(getRoomName(id));
    });
  });

  describe("generateAccessToken", () => {
    it("returns a signed JWT string", async () => {
      const token = await generateAccessToken({
        roomName: "session-test",
        userId: "user-1",
        displayName: "Test Teacher",
        userEmail: "teacher@example.com",
        role: "teacher",
      });

      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it("produces different tokens for different users", async () => {
      const tokenA = await generateAccessToken({
        roomName: "session-x",
        userId: "user-a",
        displayName: "User A",
        userEmail: null,
        role: "parent",
      });
      const tokenB = await generateAccessToken({
        roomName: "session-x",
        userId: "user-b",
        displayName: "User B",
        userEmail: null,
        role: "parent",
      });

      expect(tokenA).not.toBe(tokenB);
    });

    it("throws when API credentials are missing", async () => {
      delete process.env.LIVEKIT_API_SECRET;
      await expect(
        generateAccessToken({
          roomName: "room",
          userId: "u1",
          displayName: "X",
          userEmail: null,
          role: "parent",
        })
      ).rejects.toThrow(/LIVEKIT_API_KEY/);
    });
  });
});
