import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH: Update teacher away mode status (is_away, away_until, away_message).
 * Teachers can only update their own profile.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { is_away, away_until, away_message } = body;

    if (typeof is_away !== "boolean") {
      return NextResponse.json(
        { error: "is_away (boolean) est requis" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const update: Record<string, unknown> = {
      is_away,
      away_until: is_away ? (away_until || null) : null,
      away_message: is_away ? (away_message || null) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("teacher_profiles")
      .update(update)
      .eq("id", user.id);

    if (error) {
      console.error("[teacher/availability] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[teacher/availability] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
