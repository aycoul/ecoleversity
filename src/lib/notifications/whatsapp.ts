import type { NotificationPayload } from './types';
import { getUserContactInfo } from './user-profile';
import { getWhatsAppProvider } from './providers';

/**
 * Send a WhatsApp template message via the configured provider
 * (AILead by default, 360dialog for rollback).
 *
 * Returns true if sent successfully, false on any failure.
 * Keeps the boolean shape for backwards-compatibility with cascade.ts.
 * Callers needing the structured error should call
 * getWhatsAppProvider().sendTemplate() directly.
 */
export async function sendWhatsApp(
  phone: string,
  templateName: string,
  templateParams: string[],
  language: string = 'fr',
): Promise<boolean> {
  const provider = getWhatsAppProvider();
  const result = await provider.sendTemplate(
    phone,
    templateName,
    templateParams,
    { language },
  );

  if (!result.success) {
    console.warn(
      `[whatsapp] Send failed via ${provider.name}: ${result.errorCode ?? 'unknown'}`,
    );
  }

  return result.success;
}

/**
 * Map a NotificationPayload to a WhatsApp template call.
 * Returns true if sent, false if no phone or template or API error.
 */
export async function sendWhatsAppNotification(
  payload: NotificationPayload,
): Promise<boolean> {
  const phone = (await getUserContactInfo(payload.userId)).phone;
  if (!phone) {
    console.warn(`[whatsapp] No phone for user ${payload.userId}`);
    return false;
  }

  const { event, data } = payload;

  switch (event) {
    case 'booking_confirmed':
      return sendWhatsApp(phone, 'booking_confirmed', [
        String(data.teacherName ?? ''),
        String(data.date ?? ''),
        String(data.time ?? ''),
      ]);

    case 'payment_confirmed':
      return sendWhatsApp(phone, 'payment_confirmed', [
        String(data.amount ?? ''),
        String(data.reference ?? ''),
      ]);

    case 'session_reminder_24h':
      return sendWhatsApp(phone, 'session_reminder', [
        String(data.teacherName ?? ''),
        '24 heures',
        String(data.joinUrl ?? ''),
      ]);

    case 'session_reminder_15min':
      return sendWhatsApp(phone, 'session_reminder', [
        String(data.teacherName ?? ''),
        '15 minutes',
        String(data.joinUrl ?? ''),
      ]);

    case 'new_message':
      return sendWhatsApp(phone, 'new_message', [
        String(data.senderName ?? ''),
      ]);

    case 'teacher_verified':
      return sendWhatsApp(phone, 'teacher_verified', [
        String(data.teacherName ?? 'Enseignant'),
      ]);

    case 'payout_processed':
      return sendWhatsApp(phone, 'payout_processed', [
        String(data.amount ?? ''),
        String(data.provider ?? ''),
      ]);

    default:
      return false;
  }
}
