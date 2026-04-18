// AILead WhatsApp provider — outbound only.
//
// Scope today (MVP): OTPs and transactional notifications sent from
// EcoleVersity → AILead → Meta → parent's WhatsApp. Direction: outbound only.
//
// Inbound gap: EcoleVersity has no dedicated phone_number_id on the shared
// WABA. Parents replying to our messages reach the WABA owner's AI, not an
// EcoleVersity-scoped bot. This is acceptable for MVP because (a) our
// templates don't invite free-form replies and (b) the "Ama" chatbot is
// Phase 7 scope. When we migrate to a dedicated EcoleVersity WABA post
// Meta business verification, inbound routing activates automatically on
// AILead's side (migration 034).
//
// Rollback: set WHATSAPP_PROVIDER=360dialog on Vercel to bypass AILead.

import { z } from 'zod';
import type {
  SendOptions,
  SendResult,
  WhatsAppErrorCode,
  WhatsAppProvider,
} from './types';

const DEFAULT_TIMEOUT_MS = 5_000;

const AiLeadSuccessSchema = z.object({
  success: z.literal(true),
  message_id: z.string(),
});

const AiLeadErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

type AiLeadConfig = {
  apiUrl: string;
  apiKey: string;
  businessId: string;
  timeoutMs?: number;
};

/**
 * Maps AILead error strings to typed error codes.
 * Mirrors the codes AILead documented in their F5 response.
 */
function mapErrorCode(raw: string): WhatsAppErrorCode {
  // Defensive: AILead has shipped both lowercase (docs) and uppercase
  // (runtime) error codes. Normalize before matching.
  switch (raw.toLowerCase()) {
    case 'recipient_not_allowed':
    case 'template_not_found':
    case 'template_not_approved':
    case 'rate_limit_exceeded':
    case 'recipient_opted_out':
    case 'invalid_phone_format':
    case 'gateway_error':
      return raw.toLowerCase() as WhatsAppErrorCode;
    case 'unauthorized':
    case 'forbidden':
      return 'unauthorized';
    default:
      return 'unknown';
  }
}

function readConfig(): AiLeadConfig | null {
  const apiUrl = process.env.AILEAD_API_URL;
  const apiKey = process.env.AILEAD_API_KEY;
  const businessId = process.env.AILEAD_BUSINESS_ID;

  if (!apiUrl || !apiKey || !businessId) return null;

  return { apiUrl, apiKey, businessId };
}

async function postToAilead(
  config: AiLeadConfig,
  body: Record<string, unknown>,
): Promise<SendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        business_id: config.businessId,
        ...body,
      }),
      signal: controller.signal,
    });

    const payload = (await res.json().catch(() => null)) as unknown;

    if (res.ok) {
      const parsed = AiLeadSuccessSchema.safeParse(payload);
      if (parsed.success) {
        return { success: true, messageId: parsed.data.message_id };
      }
      console.error('[ailead] Unexpected success payload shape:', payload);
      return { success: false, errorCode: 'unknown' };
    }

    const errorParsed = AiLeadErrorSchema.safeParse(payload);
    if (errorParsed.success) {
      return {
        success: false,
        errorCode: mapErrorCode(errorParsed.data.error),
        errorMessage: errorParsed.data.message,
      };
    }

    console.error(`[ailead] API error ${res.status}:`, payload);
    return {
      success: false,
      errorCode: res.status === 401 || res.status === 403 ? 'unauthorized' : 'gateway_error',
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, errorCode: 'timeout' };
    }
    console.error('[ailead] Send error:', err);
    return { success: false, errorCode: 'gateway_error' };
  } finally {
    clearTimeout(timeout);
  }
}

export function createAileadProvider(): WhatsAppProvider {
  return {
    name: 'ailead',

    async sendTemplate(
      phone: string,
      templateName: string,
      templateParams: string[],
      opts?: SendOptions,
    ): Promise<SendResult> {
      const config = readConfig();
      if (!config) {
        console.warn('[ailead] Missing AILEAD_* env vars, skipping send');
        return { success: false, errorCode: 'unauthorized' };
      }

      return postToAilead(config, {
        to: phone,
        template: templateName,
        template_params: templateParams,
        ...(opts?.idempotencyKey ? { idempotency_key: opts.idempotencyKey } : {}),
      });
    },

    async sendText(
      phone: string,
      text: string,
      opts?: SendOptions,
    ): Promise<SendResult> {
      const config = readConfig();
      if (!config) {
        console.warn('[ailead] Missing AILEAD_* env vars, skipping send');
        return { success: false, errorCode: 'unauthorized' };
      }

      return postToAilead(config, {
        to: phone,
        text,
        ...(opts?.idempotencyKey ? { idempotency_key: opts.idempotencyKey } : {}),
      });
    },
  };
}
