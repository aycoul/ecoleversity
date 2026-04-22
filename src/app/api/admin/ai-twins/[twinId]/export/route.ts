import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Download a single training_content row as raw JSON. Admin-only. Useful
 * for (a) inspecting the exact payload the twin trainer will consume and
 * (b) handing a sample to an external annotator.
 *
 * Query: ?rowId=<uuid> (required) — the ai_training_content row to export.
 *        Omitted → export all rows for the twin.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ twinId: string }> }
) {
  const { twinId } = await ctx.params;
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

  const rowId = req.nextUrl.searchParams.get("rowId");
  const admin = createAdminClient();
  const query = admin
    .from("ai_training_content")
    .select("*")
    .eq("twin_id", twinId);
  const { data } = rowId
    ? await query.eq("id", rowId)
    : await query.order("created_at", { ascending: true });

  const body = JSON.stringify(data ?? [], null, 2);
  const filename = rowId ? `twin-${twinId}-row-${rowId}.json` : `twin-${twinId}-all.json`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
