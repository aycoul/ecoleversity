import type { WhatsAppProvider } from './types';
import { createAileadProvider } from './ailead';
import { create360dialogProvider } from './threesixtydialog';

export type {
  WhatsAppProvider,
  SendResult,
  SendOptions,
  WhatsAppErrorCode,
} from './types';
export { WHATSAPP_ERROR_MESSAGES_FR } from './types';

let cachedProvider: WhatsAppProvider | null = null;

/**
 * Returns the active WhatsApp provider based on WHATSAPP_PROVIDER env var.
 * Defaults to AILead. Cached per process for the lifetime of the function
 * instance — env changes require redeploy.
 *
 * To rollback from AILead to 360dialog in an outage: set
 * WHATSAPP_PROVIDER=360dialog on Vercel and redeploy. No code change.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.WHATSAPP_PROVIDER ?? 'ailead';

  switch (providerName) {
    case '360dialog':
      cachedProvider = create360dialogProvider();
      break;
    case 'ailead':
    default:
      cachedProvider = createAileadProvider();
      break;
  }

  return cachedProvider;
}

/** Test-only: reset cached provider between unit tests. */
export function __resetProviderForTests(): void {
  cachedProvider = null;
}
