import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/recordings/pending-review
 *
 * Returns the recordings whose summary is parked awaiting review by the
 * current user. Teachers see their own classes' recordings when the
 * platform's transcript_review_mode is 'teacher_review'; admins see
 * everything when it's 'admin_review'. Either way, the row's
 * summary_review_status is the source of truth.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile?.role as string | null) ?? null;

  const admin = createAdminClient();

  if (role === "admin") {
    const { data, error } = await admin
      .from("session_recordings")
      .select("id, live_class_id, summary, summary_review_status, ended_at, duration_seconds")
      .eq("summary_review_status", "awaiting_admin")
      .order("ended_at", { ascending: false });
    if (error) {
      console.error("[pending-review admin]", error.message);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
    return NextResponse.json({ recordings: data ?? [] });
  }

  if (role === "teacher") {
    const { data: classes } = await admin
      .from("live_classes")
      .select("id")
      .eq("teacher_id", user.id);
    const classIds = (classes ?? []).map((c) => c.id as string);
    if (classIds.length === 0) {
      return NextResponse.json({ recordings: [] });
    }
    const { data, error } = await admin
      .from("session_recordings")
      .select("id, live_class_id, summary, summary_review_status, ended_at, duration_seconds")
      .in("live_class_id", classIds)
      .eq("summary_review_status", "awaiting_teacher")
      .order("ended_at", { ascending: false });
    if (error) {
      console.error("[pending-review teacher]", error.message);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
    return NextResponse.json({ recordings: data ?? [] });
  }

  return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
}
