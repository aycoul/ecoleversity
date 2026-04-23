import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/sessions/teacher-present?liveClassId=<uuid>
 *
 * Returns whether the teacher has joined the LiveKit room for this session.
 * Used by learners to know if they should enter or wait.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const liveClassId = searchParams.get("liveClassId");

  if (!liveClassId) {
    return NextResponse.json({ error: "liveClassId requis" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get the teacher_id for this class
  const { data: liveClass } = await admin
    .from("live_classes")
    .select("teacher_id")
    .eq("id", liveClassId)
    .single();

  if (!liveClass) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  // Check if teacher has an admission record (they auto-admit themselves when joining)
  const { data: admission } = await admin
    .from("session_admissions")
    .select("admitted_at")
    .eq("live_class_id", liveClassId)
    .eq("user_id", liveClass.teacher_id as string)
    .maybeSingle();

  return NextResponse.json({
    teacherPresent: !!admission?.admitted_at,
    teacherId: liveClass.teacher_id,
  });
}
