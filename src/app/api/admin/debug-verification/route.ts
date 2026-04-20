import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** TEMP diagnostic — will be removed once verification empty-state bug traced. */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, admin_scope")
      .eq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    const admin = createAdminClient();
    const { data: teacherRows, error: tErr } = await admin
      .from("teacher_profiles")
      .select("id, verification_status")
      .in("verification_status", [
        "pending",
        "id_submitted",
        "diploma_submitted",
        "video_submitted",
      ]);

    return NextResponse.json({
      user: user ? { id: user.id, email: user.email } : null,
      profile,
      teacherRows,
      teacherError: tErr,
      teacherCount: teacherRows?.length ?? 0,
      env: {
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SERVICE_ROLE_LEN: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
      },
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({
      error: e.message,
      name: e.name,
      stack: e.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
