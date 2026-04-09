import type { NotificationPayload } from './types';
import { sendEmail } from './email';
import { sendPush } from './push';
import { sendWhatsAppNotification } from './whatsapp';
import { getUserPreferences, shouldNotify } from './cascade';

/**
 * Central notification dispatcher with cascade logic.
 *
 * Cascade order based on user preference:
 * - whatsapp: WhatsApp -> email -> push
 * - email: email -> push
 * - push: push -> email
 *
 * Push is ALWAYS sent in addition (it's free).
 * WhatsApp gracefully degrades to email if API key missing or send fails.
 * Quiet hours respected for non-critical events.
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<void> {
  try {
    const prefs = await getUserPreferences(payload.userId);

    // Check quiet hours (critical events bypass)
    if (!shouldNotify(prefs, payload.event)) {
      return;
    }

    // Always send push (free, instant) — fire and forget
    if (prefs.push_enabled) {
      sendPush(payload).catch(() => {});
    }

    // Primary channel with fallback
    if (
      prefs.preferred_channel === 'whatsapp' &&
      prefs.whatsapp_enabled
    ) {
      const sent = await sendWhatsAppNotification(payload);
      if (!sent && prefs.email_enabled) {
        await sendEmail(payload);
      }
    } else if (
      prefs.preferred_channel === 'email' &&
      prefs.email_enabled
    ) {
      await sendEmail(payload);
    } else if (
      prefs.preferred_channel === 'push' &&
      prefs.push_enabled
    ) {
      // Push already sent above; fallback to email
      if (prefs.email_enabled) {
        await sendEmail(payload);
      }
    } else if (prefs.email_enabled) {
      // No preferred channel enabled — fallback to email
      await sendEmail(payload);
    }
  } catch (err) {
    console.error(`[notifications] Cascade error for ${payload.event}:`, err);
    // Last resort: try email + push directly
    await Promise.allSettled([sendEmail(payload), sendPush(payload)]);
  }
}
