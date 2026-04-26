import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

const bodySchema = z.object({
  userId: z.string().uuid(),
  enabled: z.boolean(),
});

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

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { userId, enabled } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ ai_services_enabled: enabled })
    .eq("id", userId);
  if (error) {
    console.error("[ai-services-toggle] update failed:", error.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
