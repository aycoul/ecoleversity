import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * POST /api/admin/process-existing-payout
 *
 * Body: { payoutId: uuid }
 *
 * Flips an EXISTING pending teacher_payouts row to completed. Used for
 * payouts the teacher requested (which already created the row), so the
 * admin doesn't try to insert a duplicate that fails the period-overlap
 * check.
 *
 * Auth: admin role + 'payouts' scope (finance / founder).
 * Audit: every flip is recorded with before/after.
 */

const bodySchema = z.object({
  payoutId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (profile?.role !== "admin" || !canAccess(scope, "payouts")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "payoutId requis" }, { status: 400 });
  }
  const { payoutId } = parsed.data;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("teacher_payouts")
    .select("id, teacher_id, amount_xof, status, payout_phone, provider, period_start, period_end")
    .eq("id", payoutId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Versement introuvable" }, { status: 404 });
  }
  if (existing.status === "completed") {
    return NextResponse.json({ ok: true, status: "already_completed" });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Statut inattendu: ${existing.status}` },
      { status: 409 }
    );
  }

  // Defense-in-depth: refuse if the row is missing payout details (a
  // pending row should have them, but a corrupted row would silently
  // result in a "completed" payout sent to no one).
  if (!existing.payout_phone || !existing.provider) {
    return NextResponse.json(
      { error: "Ce versement n'a pas de coordonnées de paiement" },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("teacher_payouts")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", payoutId)
    .eq("status", "pending");
  if (updateError) {
    console.error("[process-existing-payout] update failed:", updateError.message);
    return NextResponse.json({ error: "Échec" }, { status: 500 });
  }

  await logAdminAction({
    actorId: user.id,
    actorScope: scope,
    action: "payout.confirm_existing",
    targetTable: "teacher_payouts",
    targetId: payoutId,
    before: { status: "pending" },
    after: { status: "completed" },
    notes: `Confirmed ${existing.amount_xof} XOF to ${existing.payout_phone} via ${existing.provider}`,
  });

  return NextResponse.json({ ok: true, status: "completed" });
}
