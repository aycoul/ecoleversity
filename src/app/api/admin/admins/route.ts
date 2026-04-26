import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/admins — list all admins.
 *
 * Founder-only. Returns role='admin' profiles joined with email + scope.
 * Used by the admin-management UI.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin" || me?.admin_scope !== "founder") {
    return NextResponse.json({ error: "Réservé au fondateur" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id, display_name, admin_scope, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const ids = (admins ?? []).map((a) => a.id as string);
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const rows = (admins ?? []).map((a) => ({
    id: a.id as string,
    displayName: (a.display_name as string | null) ?? null,
    email: emailById.get(a.id as string) ?? null,
    adminScope: (a.admin_scope as string | null) ?? null,
    createdAt: a.created_at as string,
    isSelf: a.id === user.id,
  }));

  return NextResponse.json({ admins: rows.filter((r) => ids.includes(r.id)) });
}
