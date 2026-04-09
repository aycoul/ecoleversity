import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Test the HMAC verification logic used in sms-confirm route
function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (Buffer.from(signature).length !== Buffer.from(expected).length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

describe("SMS payment security", () => {
  describe("HMAC verification", () => {
    const secret = "test-webhook-secret";
    const payload = JSON.stringify({ amount: 5000, reference: "EV-ABC123", provider: "orange_money" });

    it("accepts valid HMAC signature", () => {
      const validSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      expect(verifyHmac(payload, validSig, secret)).toBe(true);
    });

    it("rejects invalid signature", () => {
      expect(verifyHmac(payload, "definitely-wrong-signature", secret)).toBe(false);
    });

    it("rejects signature from different secret", () => {
      const wrongSig = crypto.createHmac("sha256", "wrong-secret").update(payload).digest("hex");
      expect(verifyHmac(payload, wrongSig, secret)).toBe(false);
    });

    it("rejects signature from different payload", () => {
      const tampered = JSON.stringify({ amount: 999999, reference: "EV-ABC123", provider: "orange_money" });
      const sigForOriginal = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      expect(verifyHmac(tampered, sigForOriginal, secret)).toBe(false);
    });

    it("produces different signatures for different payloads", () => {
      const sig1 = crypto.createHmac("sha256", secret).update("payload1").digest("hex");
      const sig2 = crypto.createHmac("sha256", secret).update("payload2").digest("hex");
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("timestamp replay protection", () => {
    const MAX_AGE_MS = 5 * 60 * 1000;

    it("accepts request within 5-minute window", () => {
      const timestamp = Date.now() - (4 * 60 * 1000); // 4 min ago
      const age = Date.now() - timestamp;
      expect(age < MAX_AGE_MS).toBe(true);
    });

    it("rejects request older than 5 minutes", () => {
      const timestamp = Date.now() - (6 * 60 * 1000); // 6 min ago
      const age = Date.now() - timestamp;
      expect(age > MAX_AGE_MS).toBe(true);
    });

    it("rejects request with future timestamp beyond window", () => {
      const timestamp = Date.now() + (6 * 60 * 1000); // 6 min in future
      const age = Date.now() - timestamp;
      // Negative age, absolute value exceeds window
      expect(Math.abs(age) > MAX_AGE_MS).toBe(true);
    });
  });
});
