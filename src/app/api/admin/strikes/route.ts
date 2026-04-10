import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const strikeSchema = z.object({
  teacherId: z.string().uuid(),
  level: z.enum(["warning", "strike1", "strike2", "strike3"]),
  reason: z.string().min(1).max(1000),
  reportId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = strikeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Create strike
    const { error } = await adminSupabase.from("teacher_strikes").insert({
      teacher_id: parsed.data.teacherId,
      level: parsed.data.level,
      reason: parsed.data.reason,
      report_id: parsed.data.reportId ?? null,
      issued_by: user.id,
      expires_at: parsed.data.level === "strike3"
        ? null // Permanent
        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
    });

    if (error) {
      console.error("[strikes] Create error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    // If strike3 — ban teacher (set verification_status to banned)
    if (parsed.data.level === "strike3") {
      await adminSupabase
        .from("teacher_profiles")
        .update({ verification_status: "banned" })
        .eq("id", parsed.data.teacherId);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[strikes] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
