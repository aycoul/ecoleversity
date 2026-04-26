import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import type { AdminScope } from "@/lib/admin/scopes";

/**
 * PATCH /api/admin/admins/scope — change an admin's scope.
 *
 * Founder-only. Body: { userId, scope }. Cannot change another
 * founder's scope (demote-to-non-founder is treated as a downgrade
 * and must go through revoke); cannot change your own scope (foot-gun
 * — would lock you out of /dashboard/admin/admins).
 */

const ALLOWED_SCOPES: AdminScope[] = [
  "founder",
  "finance",
  "moderation",
  "verification",
  "support",
  "analytics_viewer",
  "school_admin",
];

const bodySchema = z.object({
  userId: z.string().uuid(),
  scope: z.enum(ALLOWED_SCOPES as [AdminScope, ...AdminScope[]]),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: actor } } = await supabase.auth.getUser();
  if (!actor) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", actor.id)
    .maybeSingle();
  if (actorProfile?.role !== "admin" || actorProfile?.admin_scope !== "founder") {
    return NextResponse.json({ error: "Réservé au fondateur" }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { userId, scope } = parsed.data;

  if (userId === actor.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre scope" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, admin_scope")
    .eq("id", userId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }
  if (target.role !== "admin") {
    return NextResponse.json({ error: "Cet utilisateur n'est pas admin" }, { status: 400 });
  }
  if (target.admin_scope === "founder" && scope !== "founder") {
    return NextResponse.json(
      { error: "Pour rétrograder un fondateur, utilisez la révocation." },
      { status: 400 }
    );
  }

  const before = { admin_scope: target.admin_scope };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ admin_scope: scope })
    .eq("id", userId);
  if (updateError) {
    console.error("[admins/scope] update failed:", updateError.message);
    return NextResponse.json({ error: "Échec" }, { status: 500 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorScope: "founder",
    action: "admins.scope_change",
    targetTable: "profiles",
    targetId: userId,
    before,
    after: { admin_scope: scope },
  });

  return NextResponse.json({ ok: true });
}
