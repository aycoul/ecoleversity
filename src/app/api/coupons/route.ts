import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createCouponSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9]+$/),
  discountPercent: z.number().int().min(5).max(100),
  maxUses: z.number().int().min(1).max(1000),
  expiresAt: z.string().datetime(),
  courseId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
});

/** GET: List teacher's coupons */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: coupons } = await supabase
      .from("coupons")
      .select("id, code, discount_percent, max_uses, current_uses, expires_at, course_id, class_id, is_active, created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ data: coupons ?? [] });
  } catch (err) {
    console.error("[coupons] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST: Create a coupon */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // Verify teacher role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides", details: parsed.error.issues }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check code uniqueness for this teacher
    const { data: existing } = await adminSupabase
      .from("coupons")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("code", parsed.data.code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
    }

    const { data: coupon, error } = await adminSupabase
      .from("coupons")
      .insert({
        teacher_id: user.id,
        code: parsed.data.code,
        discount_percent: parsed.data.discountPercent,
        max_uses: parsed.data.maxUses,
        current_uses: 0,
        expires_at: parsed.data.expiresAt,
        course_id: parsed.data.courseId ?? null,
        class_id: parsed.data.classId ?? null,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[coupons] Create error:", error);
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }

    return NextResponse.json({ data: { couponId: coupon?.id } });
  } catch (err) {
    console.error("[coupons] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE: Deactivate a coupon */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get("id");
    if (!couponId) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const adminSupabase = createAdminClient();
    await adminSupabase
      .from("coupons")
      .update({ is_active: false })
      .eq("id", couponId)
      .eq("teacher_id", user.id);

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[coupons] Delete error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
