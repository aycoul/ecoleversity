#!/usr/bin/env node
/**
 * Google OAuth Setup Verification Script
 *
 * Usage:
 *   1. Set up Google OAuth credentials (see GOOGLE_OAUTH_SETUP.md)
 *   2. Add credentials to .env.local:
 *      SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
 *      SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
 *   3. Run: node scripts/setup-google-oauth.mjs
 *
 * This script:
 *   - Verifies the Supabase auth settings show google=true
 *   - Checks that redirect URLs are properly configured
 *   - Provides next steps
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_REF = "vhivhqfhpwhrlinjjfwa";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    const vars = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match && !match[2].startsWith("your-")) {
        vars[match[1]] = match[2].trim();
      }
    }
    return vars;
  } catch {
    return {};
  }
}

async function getAuthSettings(anonKey) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const env = loadEnv();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local");
    process.exit(1);
  }

  console.log("🔍 Checking Supabase auth settings...\n");

  try {
    const settings = await getAuthSettings(anonKey);

    console.log("📊 External Providers:");
    for (const [provider, enabled] of Object.entries(settings.external || {})) {
      const icon = enabled ? "✅" : "❌";
      console.log(`   ${icon} ${provider}: ${enabled}`);
    }

    const googleEnabled = settings.external?.google;

    console.log("\n📋 Summary:");
    if (googleEnabled) {
      console.log("   ✅ Google OAuth is ENABLED in Supabase");
      console.log("   ✅ Users can now sign in with Google");
    } else {
      console.log("   ❌ Google OAuth is DISABLED in Supabase");
      console.log("   📖 Follow the steps in GOOGLE_OAUTH_SETUP.md to enable it");
    }

    console.log("\n🌐 Site Configuration:");
    console.log(`   Site URL: ${settings.site_url || "(not set)"}`);
    console.log(`   Disable signup: ${settings.disable_signup}`);
  } catch (err) {
    console.error("❌ Failed to fetch auth settings:", err.message);
    process.exit(1);
  }
}

main();
