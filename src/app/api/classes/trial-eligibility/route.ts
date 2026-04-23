import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/classes/trial-eligibility?teacherId=<uuid>
 *
 * Returns whether the current parent can book a trial session
 * with the given teacher. Each parent gets at most 1 trial per teacher.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");

  if (!teacherId) {
    return NextResponse.json(
      { error: "teacherId requis" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("trial_eligibilities")
    .select("id")
    .eq("parent_id", user.id)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  return NextResponse.json({
    eligible: !existing,
    teacherId,
  });
}
