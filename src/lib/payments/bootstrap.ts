/**
 * SMS parsing utilities for bootstrap payment confirmation.
 *
 * Orange Money and Wave send distinct SMS formats when a transfer is received.
 * We parse these to extract the amount, sender phone, and (if present) the
 * payment reference the parent was instructed to include.
 */

type ParsedSms = {
  amount: number;
  sender: string;
  reference?: string;
};

/**
 * Orange Money SMS format (Côte d'Ivoire):
 *   "Vous avez recu 2000 FCFA de 0707070707. Ref: EV-M1ABC-X7YZ"
 *   "Vous avez recu 3 500 FCFA de 0707070707"
 *
 * Amount may contain spaces or dots as thousand separators.
 */
export function parseOrangeMoneySms(sms: string): ParsedSms | null {
  // Match amount (with optional thousand separators) + sender phone
  const amountMatch = sms.match(
    /recu\s+([\d\s.]+)\s*FCFA\s+de\s+([\d]{10})/i
  );
  if (!amountMatch) return null;

  const rawAmount = amountMatch[1].replace(/[\s.]/g, "");
  const amount = parseInt(rawAmount, 10);
  if (isNaN(amount) || amount <= 0) return null;

  const sender = amountMatch[2];

  // Try to extract reference (EV-XXXX-YYYY pattern)
  const refMatch = sms.match(/\b(EV-[A-Z0-9]+-[A-Z0-9]+)\b/i);
  const reference = refMatch ? refMatch[1].toUpperCase() : undefined;

  return { amount, sender, reference };
}

/**
 * Wave SMS format (Côte d'Ivoire):
 *   "Transfert recu de 2000 F de 0505050505"
 *   "Transfert recu de 3 500 F de 0505050505. EV-M1ABC-X7YZ"
 */
export function parseWaveSms(sms: string): ParsedSms | null {
  const amountMatch = sms.match(
    /recu\s+de\s+([\d\s.]+)\s*F\b.*?de\s+([\d]{10})/i
  );
  if (!amountMatch) return null;

  const rawAmount = amountMatch[1].replace(/[\s.]/g, "");
  const amount = parseInt(rawAmount, 10);
  if (isNaN(amount) || amount <= 0) return null;

  const sender = amountMatch[2];

  const refMatch = sms.match(/\b(EV-[A-Z0-9]+-[A-Z0-9]+)\b/i);
  const reference = refMatch ? refMatch[1].toUpperCase() : undefined;

  return { amount, sender, reference };
}

/**
 * Unified parser — delegates to the provider-specific parser.
 */
export function parsePaymentSms(
  sms: string,
  provider: string
): ParsedSms | null {
  switch (provider.toLowerCase()) {
    case "orange_money":
    case "orange":
      return parseOrangeMoneySms(sms);
    case "wave":
      return parseWaveSms(sms);
    default:
      // Try both parsers as fallback
      return parseOrangeMoneySms(sms) ?? parseWaveSms(sms);
  }
}
