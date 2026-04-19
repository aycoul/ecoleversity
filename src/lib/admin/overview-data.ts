import { createAdminClient } from "@/lib/supabase/admin";

export type OverviewCounts = {
  pendingVerifications: number;
  pendingPayments: number;
  pendingPayouts: number;
  pendingReports: number;
  openTickets: number;
  activeStrikes: number;
};

export type TodaySnapshot = {
  revenueXof: number;
  gmvXof: number;
  newSignups: number;
  newParents: number;
  newTeachers: number;
  sessionsCompleted: number;
  sessionsScheduledToday: number;
};

export type AgentEscalationSummary = {
  agent: string;
  pending: number;
};

/**
 * Fetch everything the Overview hub needs in one pass. All queries use the
 * admin client (RLS bypass) since the layout has already verified the caller
 * is an admin. Each query is a `count` — cheap, no row data pulled.
 */
export async function loadAdminOverview(): Promise<{
  counts: OverviewCounts;
  today: TodaySnapshot;
  agentEscalations: AgentEscalationSummary[];
}> {
  const supabase = createAdminClient();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);
  const startIso = startOfDay.toISOString();
  const endIso = endOfDay.toISOString();

  // Counts — each one returns `{ count }` via head:true + count:exact
  const [
    pendingVerifs,
    pendingPays,
    pendingPayouts,
    pendingReports,
    openTickets,
    activeStrikes,
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("teacher_payouts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase
      .from("teacher_strikes")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const counts: OverviewCounts = {
    pendingVerifications: pendingVerifs.count ?? 0,
    pendingPayments: pendingPays.count ?? 0,
    pendingPayouts: pendingPayouts.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
    openTickets: openTickets.count ?? 0,
    activeStrikes: activeStrikes.count ?? 0,
  };

  // Today's snapshot — revenue = sum of commission_amount on confirmed
  // transactions. GMV = sum of amount_xof. Signups = profiles created today.
  const [
    revenueRow,
    newParentsCount,
    newTeachersCount,
    completedCount,
    scheduledTodayCount,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount_xof, commission_amount")
      .eq("status", "confirmed")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "parent")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("live_classes")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso),
    supabase
      .from("live_classes")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso),
  ]);

  const revenueXof = (revenueRow.data ?? []).reduce(
    (sum, tx) => sum + ((tx.commission_amount as number) ?? 0),
    0
  );
  const gmvXof = (revenueRow.data ?? []).reduce(
    (sum, tx) => sum + ((tx.amount_xof as number) ?? 0),
    0
  );

  const today: TodaySnapshot = {
    revenueXof,
    gmvXof,
    newSignups: (newParentsCount.count ?? 0) + (newTeachersCount.count ?? 0),
    newParents: newParentsCount.count ?? 0,
    newTeachers: newTeachersCount.count ?? 0,
    sessionsCompleted: completedCount.count ?? 0,
    sessionsScheduledToday: scheduledTodayCount.count ?? 0,
  };

  // Agent escalations — unresolved entries in agent_audit_log, grouped
  // by agent. Table exists (migration 00017) but will be empty until the
  // VPS service ships. That's fine — empty means "all quiet on the wire".
  const { data: escalationsRaw } = await supabase
    .from("agent_audit_log")
    .select("agent_name")
    .eq("escalated", true)
    .is("escalation_resolved_at", null);

  const agentEscalations: AgentEscalationSummary[] = Object.entries(
    (escalationsRaw ?? []).reduce<Record<string, number>>((acc, row) => {
      const name = row.agent_name as string;
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([agent, pending]) => ({ agent, pending }));

  return { counts, today, agentEscalations };
}

/** Format FCFA with thin spaces every 3 digits — FR locale style. */
export function formatXof(amount: number): string {
  return new Intl.NumberFormat("fr-CI", {
    maximumFractionDigits: 0,
  }).format(amount);
}
