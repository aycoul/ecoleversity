import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";
import { normalizeCIPhone } from "@/lib/phone";

/**
 * POST /api/admin/teacher-payout-info
 *
 * Body: { teacherId, payout_phone, payout_provider }
 *
 * Admin override for setting a teacher's payout details — used when the
 * teacher hasn't filled in their own form but the founder needs to
 * release an earned payout (e.g., test accounts, or paying a teacher
 * who's offline). Phone is normalized to canonical +225XXXXXXXXXX so
 * the admin can paste any reasonable formatting.
 *
 * Auth: admin role + 'payouts' scope.
 * Audit: full before/after captured.
 */

const PAYOUT_PROVIDERS = ["orange_money", "wave", "mtn_momo", "wallet", "manual"] as const;

const bodySchema = z.object({
  teacherId: z.string().uuid(),
  payout_phone: z
    .string()
    .min(8)
    .max(20)
    .transform((v, ctx) => {
      const normalized = normalizeCIPhone(v);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Numéro Côte d'Ivoire invalide. Format attendu : 10 chiffres (ex : 07 01 02 03 04, +225 07 01 02 03 04).",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  payout_provider: z.enum(PAYOUT_PROVIDERS),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  const scope = (actorProfile?.admin_scope as AdminScope | null) ?? null;
  if (actorProfile?.role !== "admin" || !canAccess(scope, "payouts")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { teacherId, payout_phone, payout_provider } = parsed.data;

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("teacher_profiles")
    .select("id, payout_phone, payout_provider")
    .eq("id", teacherId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "Profil enseignant introuvable" }, { status: 404 });
  }

  const before = {
    payout_phone: target.payout_phone,
    payout_provider: target.payout_provider,
  };

  const { error: updateError } = await admin
    .from("teacher_profiles")
    .update({ payout_phone, payout_provider })
    .eq("id", teacherId);
  if (updateError) {
    console.error("[admin/teacher-payout-info]", updateError.message);
    return NextResponse.json({ error: "Échec" }, { status: 500 });
  }

  await logAdminAction({
    actorId: user.id,
    actorScope: scope,
    action: "teacher.payout_info_admin_set",
    targetTable: "teacher_profiles",
    targetId: teacherId,
    before,
    after: { payout_phone, payout_provider },
  });

  return NextResponse.json({ ok: true });
}
