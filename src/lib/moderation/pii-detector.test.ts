import { describe, it, expect } from "vitest";
import { detectPII } from "./pii-detector";

describe("detectPII", () => {
  describe("passes benign messages", () => {
    const benign = [
      "Bonjour, comment allez-vous?",
      "Aya a bien travaillé aujourd'hui.",
      "Le cours est prévu à 15h30.",
      "Merci pour votre aide!",
      "Hello, the lesson was great.",
      "J'ai 3 enfants qui prennent 2 cours par semaine.",
      "Le prix est de 5000 FCFA.",
      "😊 👍 great class!",
    ];
    for (const msg of benign) {
      it(`allows: ${msg}`, () => {
        expect(detectPII(msg).allowed).toBe(true);
      });
    }
  });

  describe("blocks CI phone numbers", () => {
    const phones = [
      "Mon numéro c'est 07 12 34 56 78",
      "Appelle-moi au 0712345678",
      "07-12-34-56-78",
      "07.12.34.56.78",
      "+225 07 12 34 56 78",
      "+2250712345678",
    ];
    for (const msg of phones) {
      it(`blocks: ${msg}`, () => {
        const r = detectPII(msg);
        expect(r.allowed).toBe(false);
        expect(r.blockReason).toBe("phone");
      });
    }
  });

  describe("blocks international phones", () => {
    it("US format", () => {
      const r = detectPII("Call +1 415 555 0123");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("phone");
    });
    it("French", () => {
      const r = detectPII("Mon numéro: +33 6 12 34 56 78");
      expect(r.allowed).toBe(false);
    });
  });

  describe("blocks emails", () => {
    it("standard", () => {
      const r = detectPII("email: prof.koffi@gmail.com");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("email");
    });
    it("with subdomain", () => {
      const r = detectPII("Write to me at foo.bar@sub.example.co");
      expect(r.allowed).toBe(false);
    });
  });

  describe("blocks social handles", () => {
    it("at-handle", () => {
      const r = detectPII("suivez-moi @prof_koffi sur insta");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("social_handle");
    });
    it("instagram URL", () => {
      const r = detectPII("instagram.com/prof.koffi");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("social_handle");
    });
    it("tiktok URL", () => {
      const r = detectPII("tiktok.com/@teachkoffi");
      expect(r.allowed).toBe(false);
    });
  });

  describe("blocks WhatsApp", () => {
    it("wa.me link", () => {
      const r = detectPII("ajoute-moi sur wa.me/22507123456");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("whatsapp_link");
    });
    it("WhatsApp + number", () => {
      const r = detectPII("whatsapp +22507");
      expect(r.allowed).toBe(false);
    });
  });

  describe("blocks external URLs", () => {
    it("https link", () => {
      const r = detectPII("visite https://myblog.com pour plus d'infos");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("external_url");
    });
    it("bare .com domain", () => {
      const r = detectPII("tutoring at mysite.com");
      expect(r.allowed).toBe(false);
    });
  });

  describe("blocks spelled-out phone digits", () => {
    it("French digits", () => {
      const r = detectPII("zéro sept un deux trois quatre cinq six sept huit");
      expect(r.allowed).toBe(false);
      expect(r.blockReason).toBe("spelled_out_phone");
    });
    it("English digits", () => {
      const r = detectPII("zero seven one two three four five six");
      expect(r.allowed).toBe(false);
    });
    it("mixed with separators", () => {
      const r = detectPII("zero, sept, un, deux, trois, quatre, cinq");
      expect(r.allowed).toBe(false);
    });
  });

  describe("doesn't false-positive on natural prose", () => {
    it("counting in prose", () => {
      // Only 6 digit words = below the 7-word threshold
      const r = detectPII("un deux trois quatre cinq six");
      expect(r.allowed).toBe(true);
    });
    it("time reference", () => {
      const r = detectPII("le cours est à 15h30");
      expect(r.allowed).toBe(true);
    });
    it("price", () => {
      const r = detectPII("le tarif est de 5000 FCFA");
      expect(r.allowed).toBe(true);
    });
  });
});
