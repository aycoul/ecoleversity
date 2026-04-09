import type { NotificationPayload } from './types';
import { createAdminClient } from '@/lib/supabase/admin';

const API_BASE = 'https://waba.360dialog.io/v1';

function getApiKey(): string | null {
  return process.env.WHATSAPP_API_KEY ?? null;
}

/**
 * Send a WhatsApp template message via 360dialog API.
 * Returns true if sent successfully, false on failure or missing config.
 */
export async function sendWhatsApp(
  phone: string,
  templateName: string,
  templateParams: string[],
  language: string = 'fr',
): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[whatsapp] WHATSAPP_API_KEY not set, skipping WhatsApp');
    return false;
  }

  try {
    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: templateParams.map((value) => ({
              type: 'text',
              text: value,
            })),
          },
        ],
      },
    };

    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[whatsapp] API error ${res.status}: ${errorBody}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[whatsapp] Send error:', err);
    return false;
  }
}

import { getUserContactInfo } from './user-profile';

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
      // No WhatsApp template for this event
      return false;
  }
}
