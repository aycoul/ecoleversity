import type { NotificationPayload } from './types';
import { sendEmail } from './email';
import { sendPush } from './push';

/**
 * Central notification dispatcher.
 * Sends email + push in parallel, never blocks the caller.
 * Phase 4 Task 25 will add WhatsApp + cascade logic.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await Promise.allSettled([
    sendEmail(payload),
    sendPush(payload),
  ]);
}
