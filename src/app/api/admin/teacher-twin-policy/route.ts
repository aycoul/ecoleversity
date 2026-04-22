import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin edits per-teacher twin policy: tier, consent timestamps, price ratio.
 * Admin-only — teachers cannot self-service this until the feature is cleared
 * for public rollout.
 *
 * Body (any subset):
 *   { teacherId, twin_tier, twin_voice_consent_at, twin_full_session_consent_at, twin_price_ratio }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    teacherId?: string;
    twin_tier?: "none" | "qa" | "full";
    twin_voice_consent_at?: string | null;
    twin_full_session_consent_at?: string | null;
    twin_price_ratio?: number | null;
  };
  if (!body.teacherId) {
    return NextResponse.json({ error: "teacherId required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.twin_tier !== undefined) {
    if (!["none", "qa", "full"].includes(body.twin_tier)) {
      return NextResponse.json({ error: "invalid twin_tier" }, { status: 400 });
    }
    update.twin_tier = body.twin_tier;
  }
  if (body.twin_voice_consent_at !== undefined) {
    update.twin_voice_consent_at = body.twin_voice_consent_at;
  }
  if (body.twin_full_session_consent_at !== undefined) {
    update.twin_full_session_consent_at = body.twin_full_session_consent_at;
  }
  if (body.twin_price_ratio !== undefined) {
    if (body.twin_price_ratio !== null) {
      const n = Number(body.twin_price_ratio);
      if (Number.isNaN(n) || n < 0 || n > 1) {
        return NextResponse.json(
          { error: "twin_price_ratio must be 0–1 or null" },
          { status: 400 }
        );
      }
      update.twin_price_ratio = n;
    } else {
      update.twin_price_ratio = null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", body.teacherId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
