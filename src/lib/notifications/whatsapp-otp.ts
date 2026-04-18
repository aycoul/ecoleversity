import { getWhatsAppProvider, type SendResult } from './providers';

/**
 * Formats the OTP code into a French user-facing sentence that slots
 * into the AILead `ecoleversity_notification` UTILITY template's {{1}}.
 *
 * The template body:
 *   "Bonjour! Voici une notification de EcoleVersity pour vous: {{1}}.
 *    Rendez-vous sur ecoleversity.com pour plus de details."
 *
 * Once AILead graduates to an AUTHENTICATION template (post Meta WABA
 * verification), this can be simplified back to passing just `code`.
 */
function formatOtpMessage(code: string): string {
  return `votre code de vérification est ${code} (expire dans 5 minutes)`;
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
  const templateName =
    process.env.AILEAD_OTP_TEMPLATE_NAME ?? 'ecoleversity_notification';

  return provider.sendTemplate(phone, templateName, [formatOtpMessage(code)], {
    idempotencyKey: `otp_${userId}_${code}`,
    language: 'fr',
  });
}
