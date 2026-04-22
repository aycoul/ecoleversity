import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin toggle for profiles.ai_services_enabled. Only authenticated admins
 * (profiles.role='admin') can call this. The flag controls whether a user
 * participates in the AI transcript/summary/twin pipeline — teachers get
 * their sessions transcribed, parents get summary emails.
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
    userId?: string;
    enabled?: boolean;
  };
  if (!body.userId || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "userId and enabled required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ ai_services_enabled: body.enabled })
    .eq("id", body.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
