import { Resend } from 'resend';
import type { NotificationPayload } from './types';
import {
  bookingConfirmedEmail,
  paymentConfirmedEmail,
  sessionReminderEmail,
  newMessageEmail,
  teacherVerifiedEmail,
  teacherRejectedEmail,
  newReviewEmail,
  payoutProcessedEmail,
} from './email-templates';
import { createAdminClient } from '@/lib/supabase/admin';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.NOTIFICATION_FROM_EMAIL
  ? `écoleVersity <${process.env.NOTIFICATION_FROM_EMAIL}>`
  : 'écoleVersity <notifications@ecoleversity.com>';

import { getUserContactInfo } from './user-profile';

type EmailContent = { subject: string; html: string; text: string } | null;

async function buildEmail(payload: NotificationPayload): Promise<EmailContent> {
  const { event, data } = payload;

  switch (event) {
    case 'booking_confirmed': {
      const { html, text } = bookingConfirmedEmail(
        String(data.teacherName ?? ''),
        String(data.date ?? ''),
        String(data.time ?? ''),
        data.price ?? '',
        String(data.reference ?? ''),
      );
      return { subject: 'Réservation confirmée — écoleVersity', html, text };
    }

    case 'payment_confirmed': {
      const { html, text } = paymentConfirmedEmail(
        String(data.teacherName ?? ''),
        String(data.date ?? ''),
        String(data.time ?? ''),
        data.amount ?? '',
      );
      return { subject: 'Paiement confirmé — écoleVersity', html, text };
    }

    case 'session_reminder_24h':
    case 'session_reminder_15min': {
      const minutes = event === 'session_reminder_24h' ? 1440 : 15;
      const { html, text } = sessionReminderEmail(
        String(data.teacherName ?? ''),
        String(data.date ?? ''),
        String(data.time ?? ''),
        String(data.joinUrl ?? ''),
        minutes,
      );
      const label = event === 'session_reminder_24h' ? 'demain' : 'dans 15 min';
      return { subject: `Rappel : cours ${label} — écoleVersity`, html, text };
    }

    case 'new_message': {
      const { html, text } = newMessageEmail(
        String(data.senderName ?? ''),
        String(data.preview ?? ''),
      );
      return { subject: `Nouveau message de ${data.senderName} — écoleVersity`, html, text };
    }

    case 'teacher_verified': {
      const name = data.teacherName ? String(data.teacherName) : (await getUserContactInfo(payload.userId)).full_name;
      const { html, text } = teacherVerifiedEmail(name);
      return { subject: 'Profil vérifié — écoleVersity', html, text };
    }

    case 'teacher_rejected': {
      const name = data.teacherName ? String(data.teacherName) : (await getUserContactInfo(payload.userId)).full_name;
      const { html, text } = teacherRejectedEmail(name, data.reason ? String(data.reason) : undefined);
      return { subject: 'Vérification non approuvée — écoleVersity', html, text };
    }

    case 'new_review': {
      const { html, text } = newReviewEmail(
        String(data.reviewerName ?? ''),
        Number(data.rating ?? 5),
        data.comment ? String(data.comment) : undefined,
        String(data.className ?? ''),
      );
      return { subject: 'Nouvel avis reçu — écoleVersity', html, text };
    }

    case 'payout_processed': {
      const { html, text } = payoutProcessedEmail(
        data.amount ?? '',
        String(data.provider ?? ''),
      );
      return { subject: 'Virement effectué — écoleVersity', html, text };
    }

    default:
      return null;
  }
}

export async function sendEmail(payload: NotificationPayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[notifications] RESEND_API_KEY not set, skipping email');
    return;
  }

  try {
    const email = (await getUserContactInfo(payload.userId)).email;
    if (!email) {
      console.warn(`[notifications] No email found for user ${payload.userId}`);
      return;
    }

    const content = await buildEmail(payload);
    if (!content) {
      console.warn(`[notifications] No email template for event ${payload.event}`);
      return;
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      console.error(`[notifications] Email send error for ${payload.event}:`, error);
    }
  } catch (err) {
    console.error(`[notifications] Email error for ${payload.event}:`, err);
  }
}
