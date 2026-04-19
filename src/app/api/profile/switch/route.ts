import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_LEARNER_COOKIE } from "@/lib/auth/active-learner";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SwitchSchema = z.object({
  learner_id: z.string().uuid().nullable(),
});

/**
 * POST /api/profile/switch
 *
 * Body: { learner_id: string | null }
 *   - string uuid = enter kid mode for that learner
 *   - null        = return to parent mode
 *
 * Verifies the caller is the parent of the specified learner before
 * setting the cookie. Also mirrors the selection to profiles.active_learner_id
 * for cross-device durability.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = SwitchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { learner_id } = parsed.data;
  const cookieStore = await cookies();

  if (learner_id === null) {
    // Return to parent mode — clear cookie + DB mirror
    cookieStore.delete(ACTIVE_LEARNER_COOKIE);
    await supabase
      .from("profiles")
      .update({ active_learner_id: null })
      .eq("id", user.id);
    return NextResponse.json({ active_learner_id: null, active_learner: null });
  }

  // Verify learner belongs to this parent
  const { data: learner, error } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, target_exam, avatar_url")
    .eq("id", learner_id)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[profile/switch] DB error:", error);
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }

  if (!learner) {
    return NextResponse.json({ error: "learner_not_found" }, { status: 403 });
  }

  // Set cookie (30 days)
  cookieStore.set(ACTIVE_LEARNER_COOKIE, learner.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Mirror to DB
  await supabase
    .from("profiles")
    .update({ active_learner_id: learner.id })
    .eq("id", user.id);

  return NextResponse.json({
    active_learner_id: learner.id,
    active_learner: learner,
  });
}
