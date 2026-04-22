import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST: Teacher requests a payout for their pending earnings.
 * Validates minimum amount (5000 XOF), creates a teacher_payouts record
 * with status "pending".
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Fetch teacher profile for payout method
    const { data: tp } = await supabase
      .from("teacher_profiles")
      .select("payout_phone, payout_provider")
      .eq("id", user.id)
      .single();

    if (!tp?.payout_phone || !tp?.payout_provider) {
      return NextResponse.json(
        { error: "Méthode de paiement non configurée" },
        { status: 400 }
      );
    }

    // Calculate pending payout
    const { data: transactions } = await supabase
      .from("transactions")
      .select("teacher_amount")
      .eq("teacher_id", user.id)
      .eq("status", "confirmed");

    const totalEarned = (transactions ?? []).reduce(
      (sum, tx) => sum + (tx.teacher_amount ?? 0),
      0
    );

    const { data: payouts } = await supabase
      .from("teacher_payouts")
      .select("amount_xof")
      .eq("teacher_id", user.id)
      .eq("status", "completed");

    const totalPaidOut = (payouts ?? []).reduce(
      (sum, p) => sum + (p.amount_xof ?? 0),
      0
    );

    const pendingAmount = Math.max(0, totalEarned - totalPaidOut);
    const MIN_PAYOUT = 5000;

    if (pendingAmount < MIN_PAYOUT) {
      return NextResponse.json(
        { error: `Montant minimum de retrait : ${MIN_PAYOUT} FCFA` },
        { status: 400 }
      );
    }

    // Check for existing pending/processing payout
    const { data: existing } = await supabase
      .from("teacher_payouts")
      .select("id")
      .eq("teacher_id", user.id)
      .in("status", ["pending", "processing"]);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Vous avez déjà une demande de retrait en cours" },
        { status: 400 }
      );
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const admin = createAdminClient();
    const { error } = await admin.from("teacher_payouts").insert({
      teacher_id: user.id,
      amount_xof: pendingAmount,
      payout_phone: tp.payout_phone,
      provider: tp.payout_provider,
      status: "pending",
      period_start: periodStart,
      period_end: now.toISOString(),
    });

    if (error) {
      console.error("[payout-request] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, amount: pendingAmount });
  } catch (err) {
    console.error("[payout-request] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
