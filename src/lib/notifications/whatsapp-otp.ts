import { getWhatsAppProvider, type SendResult } from './providers';

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
    process.env.AILEAD_OTP_TEMPLATE_NAME ?? 'ecoleversity_otp_fr';

  return provider.sendTemplate(phone, templateName, [code], {
    idempotencyKey: `otp_${userId}_${code}`,
    language: 'fr',
  });
}
