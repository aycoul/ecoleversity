import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const reportSchema = z.object({
  targetType: z.enum(["teacher", "class", "course", "review", "message"]),
  targetId: z.string().uuid(),
  category: z.enum(["inappropriate", "safety", "spam", "off_platform", "other"]),
  description: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check duplicate report
    const { data: existing } = await adminSupabase
      .from("content_reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("target_type", parsed.data.targetType)
      .eq("target_id", parsed.data.targetId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà signalé ce contenu" }, { status: 409 });
    }

    const { error } = await adminSupabase.from("content_reports").insert({
      reporter_id: user.id,
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      status: "pending",
    });

    if (error) {
      console.error("[reports] Create error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[reports] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
