import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createSchema = z.object({
  teacherId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountPaidXof: z.number().int().min(0),
  placement: z.enum(["homepage", "marketplace", "both"]).default("both"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "school_admin") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("featured_teachers")
      .insert({
        teacher_id: parsed.data.teacherId,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        amount_paid_xof: parsed.data.amountPaidXof,
        placement: parsed.data.placement,
      })
      .select("id, teacher_id, start_date, end_date, amount_paid_xof, placement, active")
      .single();

    if (error) {
      console.error("Create featured teacher error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la creation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("Featured teacher error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
