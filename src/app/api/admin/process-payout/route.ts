import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const payoutSchema = z.object({
  teacherId: z.string().uuid(),
  amountXof: z.number().int().positive(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "admin" && profile.role !== "school_admin")
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = payoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { teacherId, amountXof, periodStart, periodEnd } = parsed.data;
    const adminSupabase = createAdminClient();

    // Fetch teacher payout info
    const { data: teacherProfile } = await adminSupabase
      .from("teacher_profiles")
      .select("payout_phone, payout_provider")
      .eq("id", teacherId)
      .single();

    if (!teacherProfile || !teacherProfile.payout_phone || !teacherProfile.payout_provider) {
      return NextResponse.json(
        { error: "Informations de paiement enseignant manquantes" },
        { status: 400 }
      );
    }

    // Create payout record
    const { data: payout, error: payoutError } = await adminSupabase
      .from("teacher_payouts")
      .insert({
        teacher_id: teacherId,
        amount_xof: amountXof,
        payout_phone: teacherProfile.payout_phone,
        provider: teacherProfile.payout_provider,
        status: "completed",
        period_start: periodStart,
        period_end: periodEnd,
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (payoutError || !payout) {
      console.error("Error creating payout:", payoutError);
      return NextResponse.json(
        { error: "Erreur lors de la création du versement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { payoutId: payout.id, status: "completed" },
    });
  } catch (err) {
    console.error("Process payout error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
