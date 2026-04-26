import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  resetAt: string | null;
};

/**
 * Atomic per-bucket, per-identity rate limiter backed by the
 * `rate_limit_hit` Postgres function (00030_security_hardening.sql).
 *
 * Buckets are arbitrary strings (e.g. "messages", "support-chat",
 * "twin-chat"). Identity is usually a user UUID. Window/cap are
 * caller-controlled so different routes can pick their own ceilings.
 *
 * On DB error we fail open (return allowed) — limiting is defense-in-
 * depth, not the only auth check, so a transient DB blip should not
 * lock users out of their own platform.
 */
export async function rateLimit(
  bucket: string,
  identity: string,
  maxHits: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_identity: identity,
      p_max: maxHits,
      p_window_seconds: windowSeconds,
    });
    if (error || !data) {
      console.error("[rate-limit] rpc failed:", error?.message);
      return { allowed: true, count: 0, resetAt: null };
    }
    const row = data as { allowed: boolean; count: number; reset_at: string | null };
    return { allowed: row.allowed, count: row.count, resetAt: row.reset_at };
  } catch (err) {
    console.error("[rate-limit] threw:", err);
    return { allowed: true, count: 0, resetAt: null };
  }
}
