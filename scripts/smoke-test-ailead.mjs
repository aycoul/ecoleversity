#!/usr/bin/env node
// Smoke-test for AILead WhatsApp integration.
// Usage:
//   node scripts/smoke-test-ailead.mjs text +2250788046736
//   node scripts/smoke-test-ailead.mjs otp +2250788046736 847291
//
// Sends one message through AILead to verify:
//   - API URL reachable
//   - API key accepted
//   - business_id scoped correctly
//   - Response shape matches what the provider expects
//
// Prereqs:
//   - AILEAD_* env vars in .env.local
//   - Recipient phone allowlisted on the shared WABA (AILead side)
//   - For "text" mode: recipient must have messaged the shared WhatsApp number
//     within the last 24h (WhatsApp 24h window rule)
//   - For "otp" mode: ecoleversity_otp_fr template must be approved on Meta

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

async function main() {
  const [mode, to, code] = process.argv.slice(2);

  if (!mode || !to || (mode === 'otp' && !code)) {
    console.error('Usage:');
    console.error('  node scripts/smoke-test-ailead.mjs text +225XXXXXXXXXX');
    console.error('  node scripts/smoke-test-ailead.mjs otp  +225XXXXXXXXXX 123456');
    process.exit(1);
  }

  const env = loadEnv();
  const apiUrl = env.AILEAD_API_URL;
  const apiKey = env.AILEAD_API_KEY;
  const businessId = env.AILEAD_BUSINESS_ID;
  const template = env.AILEAD_OTP_TEMPLATE_NAME ?? 'ecoleversity_otp_fr';

  if (!apiUrl || !apiKey || !businessId) {
    console.error('Missing AILEAD_API_URL / AILEAD_API_KEY / AILEAD_BUSINESS_ID in .env.local');
    process.exit(1);
  }

  const body =
    mode === 'otp'
      ? {
          business_id: businessId,
          to,
          template,
          template_params: [code],
          idempotency_key: `smoke_otp_${Date.now()}`,
        }
      : {
          business_id: businessId,
          to,
          text: `Test EcoleVersity ${new Date().toISOString()}`,
          idempotency_key: `smoke_text_${Date.now()}`,
        };

  console.log(`→ POST ${apiUrl}`);
  console.log(`  business_id: ${businessId}`);
  console.log(`  to: ${to}`);
  console.log(`  mode: ${mode}`);
  if (mode === 'otp') console.log(`  template: ${template} params=[${code}]`);

  const start = Date.now();
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - start;

  const payload = await res.json().catch(() => null);

  console.log(`← HTTP ${res.status} (${latencyMs}ms)`);
  console.log(JSON.stringify(payload, null, 2));

  if (res.ok && payload?.success) {
    console.log('\n✅ PASS — AILead integration is live');
    process.exit(0);
  }

  console.log('\n❌ FAIL — see payload above');
  process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
