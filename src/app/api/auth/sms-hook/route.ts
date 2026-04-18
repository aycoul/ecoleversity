import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { z } from 'zod';
import { sendOtpViaWhatsApp } from '@/lib/notifications/whatsapp-otp';
import {
  WHATSAPP_ERROR_MESSAGES_FR,
  type WhatsAppErrorCode,
} from '@/lib/notifications/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HookPayloadSchema = z.object({
  user: z.object({
    id: z.string(),
    phone: z.string(),
  }),
  sms: z.object({
    otp: z.string(),
  }),
});

function errorResponse(httpCode: number, message: string) {
  return NextResponse.json(
    { error: { http_code: httpCode, message } },
    { status: httpCode },
  );
}

/**
 * Supabase Send SMS Hook — delivers OTP via WhatsApp through AILead.
 *
 * Supabase POSTs here whenever it needs to send an OTP (phone login,
 * signup, phone change). Expected flow:
 *   1. Verify HMAC signature using SEND_SMS_HOOK_SECRET (protects this
 *      public endpoint from forgery).
 *   2. Route the code through our WhatsApp provider (AILead).
 *   3. Return 200 {} on success, non-200 with {error} shape on failure.
 *
 * On failure Supabase surfaces an error to the client, which shows
 * "Erreur d'envoi" and enables the Resend button after throttle window.
 */
export async function POST(request: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    console.error('[sms-hook] SEND_SMS_HOOK_SECRET not configured');
    return errorResponse(500, 'Hook not configured');
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error('[sms-hook] Failed to read request body:', err);
    return errorResponse(400, 'Invalid request body');
  }

  const headers = Object.fromEntries(request.headers);
  const base64Secret = secret.replace(/^v1,whsec_/, '');

  let verified: unknown;
  try {
    const wh = new Webhook(base64Secret);
    verified = wh.verify(rawBody, headers);
  } catch (err) {
    console.warn('[sms-hook] Signature verification failed:', err);
    return errorResponse(401, 'Invalid signature');
  }

  const parsed = HookPayloadSchema.safeParse(verified);
  if (!parsed.success) {
    console.error('[sms-hook] Unexpected payload shape:', parsed.error.issues);
    return errorResponse(400, 'Invalid payload shape');
  }

  const { user, sms } = parsed.data;

  const result = await sendOtpViaWhatsApp(user.phone, user.id, sms.otp);

  if (!result.success) {
    const code: WhatsAppErrorCode = result.errorCode ?? 'unknown';
    const frenchMessage = WHATSAPP_ERROR_MESSAGES_FR[code];
    console.warn(
      `[sms-hook] OTP send failed for user ${user.id}: ${code}`,
      result.errorMessage,
    );
    return errorResponse(500, frenchMessage);
  }

  console.log(
    `[sms-hook] OTP delivered to user ${user.id} via ${result.messageId ?? 'unknown-msg-id'}`,
  );
  return NextResponse.json({}, { status: 200 });
}
