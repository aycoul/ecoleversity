import { getWhatsAppProvider, type SendResult } from './providers';

/**
 * Build the user-facing OTP WhatsApp message in French.
 *
 * We're using freeform text (not a Meta template) until AILead's shared
 * WABA completes Business Verification (2-7 days) and can submit an
 * AUTHENTICATION-category template. Freeform works for:
 *   - Phones on AILead's Meta test allowlist (current testing path)
 *   - Any recipient within the 24h service window (i.e. they messaged
 *     the shared WABA number at least once in the last 24 hours)
 *
 * This is a bootstrap limitation — post Business Verification we can
 * send templates to any recipient without the 24h window requirement.
 */
function formatOtpMessage(code: string): string {
  return `EcoleVersity: Votre code de connexion est ${code}. Il expire dans 5 minutes. Ne le partagez avec personne.`;
}

/**
 * Send a 6-digit OTP to a parent/teacher via WhatsApp.
 *
 * Used by the Supabase Send SMS Hook (src/app/api/auth/sms-hook/route.ts).
 * Supabase generates and verifies the OTP — we only deliver it.
 *
 * The idempotency key combines userId + code so:
 *   - If Supabase retries the hook (transient network), AILead dedupes
 *     within 24h and does not re-send to the parent.
 *   - If the user taps Resend and Supabase generates a NEW code, the
 *     key changes and a fresh message goes out.
 */
export async function sendOtpViaWhatsApp(
  phone: string,
  userId: string,
  code: string,
): Promise<SendResult> {
  const provider = getWhatsAppProvider();

  return provider.sendText(phone, formatOtpMessage(code), {
    idempotencyKey: `otp_${userId}_${code}`,
  });
}
