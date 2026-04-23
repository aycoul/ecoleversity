import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/classes/saved
 *
 * Returns all saved classes for the current parent, joined with live_classes
 * and teacher profiles.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_classes")
    .select(`
      id,
      saved_at,
      live_class:live_class_id (
        id, title, subject, grade_level, scheduled_at, duration_minutes, max_students, price_xof, is_trial, status,
        teacher:teacher_id (id, display_name, avatar_url)
      )
    `)
    .eq("parent_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("Fetch saved classes error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement" },
      { status: 500 }
    );
  }

  return NextResponse.json({ savedClasses: data ?? [] });
}
