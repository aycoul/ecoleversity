import type {
  SendOptions,
  SendResult,
  WhatsAppProvider,
} from './types';

const API_BASE = 'https://waba.360dialog.io/v1';
const DEFAULT_TIMEOUT_MS = 5_000;

function getApiKey(): string | null {
  return process.env.WHATSAPP_API_KEY ?? null;
}

async function post360dialog(
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SendResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[360dialog] WHATSAPP_API_KEY not set, skipping send');
    return { success: false, errorCode: 'unauthorized' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[360dialog] API error ${res.status}: ${errorBody}`);
      return {
        success: false,
        errorCode: res.status === 401 ? 'unauthorized' : 'gateway_error',
      };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, errorCode: 'timeout' };
    }
    console.error('[360dialog] Send error:', err);
    return { success: false, errorCode: 'gateway_error' };
  } finally {
    clearTimeout(timeout);
  }
}

export function create360dialogProvider(): WhatsAppProvider {
  return {
    name: '360dialog',

    async sendTemplate(
      phone: string,
      templateName: string,
      templateParams: string[],
      opts?: SendOptions,
    ): Promise<SendResult> {
      return post360dialog({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: opts?.language ?? 'fr' },
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
      });
    },

    async sendText(phone: string, text: string): Promise<SendResult> {
      return post360dialog({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      });
    },
  };
}
