import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import type { AdminScope } from "@/lib/admin/scopes";

/**
 * POST /api/admin/admins/grant — promote an existing user to admin.
 *
 * Founder-only. Body: { email: string, scope: AdminScope }. The target
 * user must already exist (via Supabase auth signup); we only flip
 * their profile role + scope. Promotion to 'founder' is also allowed
 * but warned in the UI — there's no point having two founders unless
 * you're handing the keys over.
 *
 * Every grant is recorded in admin_audit_log with before/after.
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
  email: z.string().email().toLowerCase(),
  scope: z.enum(ALLOWED_SCOPES as [AdminScope, ...AdminScope[]]),
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
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { email, scope } = parsed.data;

  const admin = createAdminClient();

  // Look up the target user by email — listUsers + filter is the
  // documented way (no /api/v1/users?email= query yet).
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const target = (usersList?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email
  );
  if (!target) {
    return NextResponse.json(
      { error: "Aucun utilisateur trouvé avec cet email. Demandez-lui de créer un compte d'abord." },
      { status: 404 }
    );
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, role, admin_scope, display_name")
    .eq("id", target.id)
    .maybeSingle();
  if (!targetProfile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const before = {
    role: targetProfile.role,
    admin_scope: targetProfile.admin_scope,
  };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "admin", admin_scope: scope })
    .eq("id", target.id);
  if (updateError) {
    console.error("[admins/grant] update failed:", updateError.message);
    return NextResponse.json({ error: "Échec de la promotion" }, { status: 500 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorScope: "founder",
    action: "admins.grant",
    targetTable: "profiles",
    targetId: target.id,
    before,
    after: { role: "admin", admin_scope: scope },
    notes: `Granted ${scope} admin to ${email}`,
  });

  return NextResponse.json({
    ok: true,
    targetId: target.id,
    email: target.email,
    displayName: targetProfile.display_name,
    scope,
  });
}
