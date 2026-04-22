import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

/**
 * Admin toggle for profiles.ai_services_enabled. Only authenticated admins
 * with ai_settings scope can call this. The flag controls whether a user
 * participates in the AI transcript/summary/twin pipeline.
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
    userId?: string;
    enabled?: boolean;
  };
  if (!body.userId || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "userId and enabled required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ ai_services_enabled: body.enabled })
    .eq("id", body.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
