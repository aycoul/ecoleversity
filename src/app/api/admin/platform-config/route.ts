import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

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

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    value?: unknown;
  };
  if (!body.key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .update({
      value: body.value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", body.key);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
