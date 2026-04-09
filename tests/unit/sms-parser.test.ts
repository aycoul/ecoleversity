import { describe, it, expect } from "vitest";
import {
  parseOrangeMoneySms,
  parseWaveSms,
  parsePaymentSms,
} from "@/lib/payments/bootstrap";

describe("parseOrangeMoneySms", () => {
  it("parses standard Orange Money format", () => {
    const result = parseOrangeMoneySms(
      "Vous avez recu 2000 FCFA de 0707070707. Ref: EV-M1ABC-X7YZ"
    );
    expect(result).toEqual({
      amount: 2000,
      sender: "0707070707",
      reference: "EV-M1ABC-X7YZ",
    });
  });

  it("parses amount with space thousand separator", () => {
    const result = parseOrangeMoneySms(
      "Vous avez recu 3 500 FCFA de 0708090102"
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(3500);
    expect(result!.sender).toBe("0708090102");
  });

  it("parses amount with dot thousand separator", () => {
    const result = parseOrangeMoneySms(
      "Vous avez recu 15.000 FCFA de 0701020304"
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
  });

  it("returns null for non-matching SMS", () => {
    expect(parseOrangeMoneySms("Votre solde est 5000 FCFA")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOrangeMoneySms("")).toBeNull();
  });

  it("extracts reference when present", () => {
    const result = parseOrangeMoneySms(
      "Vous avez recu 2000 FCFA de 0707070707 EV-ABC123-XY99"
    );
    expect(result!.reference).toBe("EV-ABC123-XY99");
  });

  it("reference is undefined when absent", () => {
    const result = parseOrangeMoneySms(
      "Vous avez recu 2000 FCFA de 0707070707"
    );
    expect(result!.reference).toBeUndefined();
  });

  it("uppercases the reference", () => {
    const result = parseOrangeMoneySms(
      "Vous avez recu 2000 FCFA de 0707070707. ev-abc-def"
    );
    expect(result!.reference).toBe("EV-ABC-DEF");
  });
});

describe("parseWaveSms", () => {
  it("parses standard Wave format", () => {
    const result = parseWaveSms(
      "Transfert recu de 2000 F de 0505050505"
    );
    expect(result).toEqual({
      amount: 2000,
      sender: "0505050505",
      reference: undefined,
    });
  });

  it("parses Wave with reference", () => {
    const result = parseWaveSms(
      "Transfert recu de 3 500 F de 0505050505. EV-M1ABC-X7YZ"
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(3500);
    expect(result!.reference).toBe("EV-M1ABC-X7YZ");
  });

  it("returns null for non-matching SMS", () => {
    expect(parseWaveSms("Votre transfert a ete envoye")).toBeNull();
  });
});

describe("parsePaymentSms (unified)", () => {
  it("routes to Orange Money parser", () => {
    const result = parsePaymentSms(
      "Vous avez recu 5000 FCFA de 0707070707",
      "orange_money"
    );
    expect(result!.amount).toBe(5000);
  });

  it("routes to Wave parser", () => {
    const result = parsePaymentSms(
      "Transfert recu de 5000 F de 0505050505",
      "wave"
    );
    expect(result!.amount).toBe(5000);
  });

  it("accepts 'orange' as alias", () => {
    const result = parsePaymentSms(
      "Vous avez recu 2000 FCFA de 0707070707",
      "orange"
    );
    expect(result).not.toBeNull();
  });

  it("tries both parsers for unknown provider", () => {
    const result = parsePaymentSms(
      "Vous avez recu 2000 FCFA de 0707070707",
      "unknown"
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000);
  });

  it("returns null when neither parser matches", () => {
    const result = parsePaymentSms("Hello world", "unknown");
    expect(result).toBeNull();
  });
});
