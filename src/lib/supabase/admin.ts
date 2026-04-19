import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const raw = process.env[name];
  if (!raw || !raw.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return raw.trim();
}

export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}
