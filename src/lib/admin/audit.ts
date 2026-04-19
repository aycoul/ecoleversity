import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminScope } from "@/lib/admin/scopes";

export type AdminAuditEntry = {
  actorId: string;
  actorScope: AdminScope | null;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  notes?: string | null;
};

/**
 * Append an entry to admin_audit_log. Never throws — audit failures
 * must not break the primary action. Failures are console.error'd so
 * they're visible in Vercel runtime logs.
 *
 * Design: writes use the service-role admin client because the log
 * table denies writes to regular authenticated users (no INSERT
 * policy). Only the backend creates entries.
 */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_scope: entry.actorScope,
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      before_json: (entry.before ?? null) as object | null,
      after_json: (entry.after ?? null) as object | null,
      notes: entry.notes ?? null,
    });
    if (error) {
      console.error("[admin-audit] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[admin-audit] unexpected:", (err as Error).message);
  }
}
