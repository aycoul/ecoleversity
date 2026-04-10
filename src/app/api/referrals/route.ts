import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { generateReferralCode, isValidReferralCode, REFERRAL_CREDIT_XOF } from "@/lib/referral";

/** GET: Get user's referral code + stats */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const code = generateReferralCode(user.id);

    // Count successful referrals
    const adminSupabase = createAdminClient();
    const { count } = await adminSupabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .eq("status", "completed");

    return NextResponse.json({
      data: {
        code,
        referralCount: count ?? 0,
        totalEarned: (count ?? 0) * REFERRAL_CREDIT_XOF,
        creditAmount: REFERRAL_CREDIT_XOF,
      },
    });
  } catch (err) {
    console.error("[referrals] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const redeemSchema = z.object({
  code: z.string().min(1),
});

/** POST: Redeem a referral code */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }

    const code = parsed.data.code.toUpperCase();

    if (!isValidReferralCode(code)) {
      return NextResponse.json({ error: "Format de code invalide" }, { status: 400 });
    }

    // Can't refer yourself
    if (code === generateReferralCode(user.id)) {
      return NextResponse.json({ error: "Vous ne pouvez pas utiliser votre propre code" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check if already redeemed a referral
    const { data: existing } = await adminSupabase
      .from("referrals")
      .select("id")
      .eq("referred_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà utilisé un code de parrainage" }, { status: 409 });
    }

    // Find the referrer by their code — check all profiles
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("id")
      .limit(500);

    const referrerId = (profiles ?? []).find(
      (p) => generateReferralCode(p.id) === code
    )?.id;

    if (!referrerId) {
      return NextResponse.json({ error: "Code de parrainage non trouvé" }, { status: 404 });
    }

    // Create referral record (status: pending — completes on first booking)
    await adminSupabase.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: user.id,
      code,
      status: "pending",
    });

    return NextResponse.json({
      data: { message: "Code accepté ! Vous recevrez votre crédit après votre première réservation." },
    });
  } catch (err) {
    console.error("[referrals] Redeem error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
