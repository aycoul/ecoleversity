import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCIPhone } from "@/lib/phone";

const PAYOUT_PROVIDERS = ["orange_money", "wave", "mtn_momo", "wallet", "manual"] as const;

const patchSchema = z.object({
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

    const raw = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { payout_phone, payout_provider } = parsed.data;

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
      return NextResponse.json({ error: "Echec de la mise à jour" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payout-info] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
