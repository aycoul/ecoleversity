import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/refunds
 *
 * Returns refund requests.
 * - Admins see all pending requests
 * - Parents see only their own requests
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // 'pending' | 'approved' | 'denied' | 'all'

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "school_admin";
  const admin = createAdminClient();

  let query = admin
    .from("refund_requests")
    .select(`
      id,
      reason,
      requested_amount_xof,
      approved_amount_xof,
      status,
      admin_notes,
      created_at,
      processed_at,
      transaction:transaction_id (id, amount_xof, payment_reference),
      parent:parent_id (display_name, email),
      live_class:live_class_id (title, scheduled_at)
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("parent_id", user.id);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch refunds error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement" },
      { status: 500 }
    );
  }

  return NextResponse.json({ refunds: data ?? [] });
}
