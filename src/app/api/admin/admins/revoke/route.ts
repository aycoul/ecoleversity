import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * POST /api/admin/admins/revoke — demote an admin back to a parent role.
 *
 * Founder-only. Body: { userId: string }. Two safety rails:
 *   1. Can't revoke yourself — you'd lock yourself out of /dashboard/admin
 *   2. Can't revoke another founder. To swap founders you grant the new
 *      one first, then have THEM revoke the old one. Forces a human
 *      handoff — no silent founder takeover.
 */

const bodySchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }
  const { userId } = parsed.data;

  if (userId === actor.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas révoquer votre propre accès fondateur" },
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
  if (target.admin_scope === "founder") {
    return NextResponse.json(
      { error: "Impossible de révoquer un autre fondateur. Demandez-lui de se révoquer lui-même." },
      { status: 400 }
    );
  }

  const before = { role: target.role, admin_scope: target.admin_scope };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "parent", admin_scope: null })
    .eq("id", userId);
  if (updateError) {
    console.error("[admins/revoke] update failed:", updateError.message);
    return NextResponse.json({ error: "Échec de la révocation" }, { status: 500 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorScope: "founder",
    action: "admins.revoke",
    targetTable: "profiles",
    targetId: userId,
    before,
    after: { role: "parent", admin_scope: null },
  });

  return NextResponse.json({ ok: true });
}
