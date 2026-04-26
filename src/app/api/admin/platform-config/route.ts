import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

// Allowlist of platform_config keys an admin endpoint may write — kept
// tight so a future scope expansion can't accidentally let the admin
// mutate a key the app reads as security-sensitive (e.g. payout caps).
const ALLOWED_KEYS = [
  "ai_services_default",
  "twin_public_access",
  "twin_qa_only_mode",
  "ai_provider_anthropic",
  "ai_provider_openai",
  "support_bot_enabled",
  "moderation_strict",
] as const;

const bodySchema = z.object({
  key: z.enum(ALLOWED_KEYS),
  value: z.unknown(),
});

/**
 * Update one platform_config row. Admin-only with ai_settings scope.
 * Value is an arbitrary JSON literal (we store numbers, strings, booleans, objects — all jsonb).
 *
 * Body: { key: string, value: unknown }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle<{ role: string; admin_scope: AdminScope | null }>();
  if (me?.role !== "admin" || !canAccess(me.admin_scope, "ai_settings")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { key, value } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .update({
      value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", key);
  if (error) {
    console.error("[platform-config] update failed:", error.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
