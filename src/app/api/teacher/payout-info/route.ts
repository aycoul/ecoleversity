import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET: Fetch teacher's payout info (phone + provider).
 */
export async function GET() {
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

    const { data: tp } = await supabase
      .from("teacher_profiles")
      .select("payout_phone, payout_provider")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      data: {
        payout_phone: tp?.payout_phone ?? null,
        payout_provider: tp?.payout_provider ?? null,
      },
    });
  } catch (err) {
    console.error("[payout-info] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH: Update teacher's payout info.
 * Body: { payout_phone: string, payout_provider: string }
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const { payout_phone, payout_provider } = body;

    if (!payout_phone || typeof payout_phone !== "string") {
      return NextResponse.json(
        { error: "Numéro de paiement requis" },
        { status: 400 }
      );
    }

    const validProviders = ["orange_money", "wave", "mtn_momo", "wallet", "manual"];
    if (!payout_provider || !validProviders.includes(payout_provider)) {
      return NextResponse.json(
        { error: "Moyen de paiement invalide" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("teacher_profiles")
      .update({
        payout_phone,
        payout_provider,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("[payout-info] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payout-info] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
