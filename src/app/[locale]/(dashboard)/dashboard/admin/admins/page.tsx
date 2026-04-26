import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShieldCheck } from "lucide-react";
import { AdminManagement, type AdminRow } from "@/components/admin/admin-management";

export const dynamic = "force-dynamic";

/**
 * Founder-only page to grant, revoke, and re-scope other admins. Lives
 * here so the founder doesn't have to touch SQL to onboard a collaborator.
 */
export default async function AdminsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin" || me?.admin_scope !== "founder") {
    redirect("/dashboard/admin");
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("profiles")
    .select("id, display_name, admin_scope, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  // Resolve emails from auth.users.
  const ids = (rows ?? []).map((r) => r.id as string);
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email && ids.includes(u.id)) emailById.set(u.id, u.email);
  }

  const adminRows: AdminRow[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    displayName: (r.display_name as string | null) ?? null,
    email: emailById.get(r.id as string) ?? "—",
    adminScope: (r.admin_scope as string | null) ?? null,
    createdAt: r.created_at as string,
    isSelf: r.id === user.id,
  }));

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-7 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administrateurs</h1>
          <p className="text-sm text-slate-500">
            Invitez vos collaborateurs et choisissez leur niveau d&apos;accès.
            Toutes les modifications sont journalisées.
          </p>
        </div>
      </div>

      <AdminManagement initialAdmins={adminRows} />
    </div>
  );
}
