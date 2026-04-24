import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RefundProcessor } from "@/components/admin/refund-processor";
import { RotateCcw } from "lucide-react";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  const t = await getTranslations("dashboard.adminRefunds");
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();

  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (!profile || profile.role !== "admin" || !canAccess(scope, "payments")) {
    redirect("/dashboard/admin");
  }

  const admin = createAdminClient();

  const { data: refunds } = await admin
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
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RotateCcw className="size-7 text-[var(--ev-blue)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      <RefundProcessor initialRefunds={refunds ?? []} />
    </div>
  );
}
