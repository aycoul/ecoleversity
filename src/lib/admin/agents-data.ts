import { createAdminClient } from "@/lib/supabase/admin";

export type AgentConfigRow = {
  id: string;
  agentName: string;
  label: string;
  description: string;
  emoji: string;
  isActive: boolean;
  confidenceThreshold: number;
  escalationWhatsappNumber: string | null;
  updatedAt: string;
  /** Stats derived from agent_audit_log, scoped to today (UTC). */
  todayDecisions: number;
  todayEscalated: number;
  todayAutoActioned: number;
  avgConfidenceToday: number | null;
  /** Most recent decision timestamp — used for "Last active 4 min ago". */
  lastDecisionAt: string | null;
};

export type AgentEscalation = {
  id: string;
  agentName: string;
  actionType: string;
  targetTable: string | null;
  targetId: string | null;
  confidenceScore: number | null;
  detailsJson: Record<string, unknown> | null;
  createdAt: string;
};

type ConfigSettings = {
  label?: string;
  description?: string;
  emoji?: string;
};

export async function loadAgentConfigs(): Promise<AgentConfigRow[]> {
  const supabase = createAdminClient();

  const { data: configs } = await supabase
    .from("agent_config")
    .select("*")
    .order("agent_name");

  if (!configs) return [];

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();

  // Pull all of today's audit rows once, group in memory — cheaper than 18 queries
  const { data: todayAudit } = await supabase
    .from("agent_audit_log")
    .select(
      "agent_name, decision, confidence_score, escalated, created_at"
    )
    .gte("created_at", startIso);

  const byAgent = new Map<string, AgentConfigRow["todayDecisions"] | number[]>();
  type Accum = {
    decisions: number;
    escalated: number;
    autoActioned: number;
    confidences: number[];
    lastAt: string | null;
  };
  const accum = new Map<string, Accum>();

  for (const row of todayAudit ?? []) {
    const key = row.agent_name as string;
    if (!accum.has(key)) {
      accum.set(key, {
        decisions: 0,
        escalated: 0,
        autoActioned: 0,
        confidences: [],
        lastAt: null,
      });
    }
    const a = accum.get(key)!;
    a.decisions += 1;
    if (row.escalated) a.escalated += 1;
    if (row.decision === "auto_approved" || row.decision === "auto_rejected") {
      a.autoActioned += 1;
    }
    if (row.confidence_score !== null) {
      a.confidences.push(Number(row.confidence_score));
    }
    const ts = row.created_at as string;
    if (!a.lastAt || ts > a.lastAt) a.lastAt = ts;
  }

  // Swallow unused warning for byAgent — kept as future cache seam
  void byAgent;

  return configs.map((c) => {
    const settings = (c.settings_json ?? {}) as ConfigSettings;
    const a = accum.get(c.agent_name as string);
    const avg =
      a && a.confidences.length > 0
        ? a.confidences.reduce((s, v) => s + v, 0) / a.confidences.length
        : null;
    return {
      id: c.id as string,
      agentName: c.agent_name as string,
      label: settings.label ?? c.agent_name,
      description: settings.description ?? "",
      emoji: settings.emoji ?? "🤖",
      isActive: c.is_active as boolean,
      confidenceThreshold: Number(c.confidence_threshold),
      escalationWhatsappNumber:
        (c.escalation_whatsapp_number as string | null) ?? null,
      updatedAt: c.updated_at as string,
      todayDecisions: a?.decisions ?? 0,
      todayEscalated: a?.escalated ?? 0,
      todayAutoActioned: a?.autoActioned ?? 0,
      avgConfidenceToday: avg,
      lastDecisionAt: a?.lastAt ?? null,
    };
  });
}

export async function loadAgentEscalations(): Promise<AgentEscalation[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_audit_log")
    .select(
      "id, agent_name, action_type, target_table, target_id, confidence_score, details_json, created_at"
    )
    .eq("escalated", true)
    .is("escalation_resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((d) => ({
    id: d.id as string,
    agentName: d.agent_name as string,
    actionType: d.action_type as string,
    targetTable: (d.target_table as string | null) ?? null,
    targetId: (d.target_id as string | null) ?? null,
    confidenceScore:
      d.confidence_score !== null ? Number(d.confidence_score) : null,
    detailsJson: (d.details_json as Record<string, unknown> | null) ?? null,
    createdAt: d.created_at as string,
  }));
}

/** Recent agent audit entries — used by the audit log search panel. */
export async function loadRecentAgentAudit(limit = 50): Promise<
  Array<{
    id: string;
    agentName: string;
    actionType: string;
    decision: string;
    confidenceScore: number | null;
    escalated: boolean;
    createdAt: string;
  }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_audit_log")
    .select(
      "id, agent_name, action_type, decision, confidence_score, escalated, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((d) => ({
    id: d.id as string,
    agentName: d.agent_name as string,
    actionType: d.action_type as string,
    decision: d.decision as string,
    confidenceScore:
      d.confidence_score !== null ? Number(d.confidence_score) : null,
    escalated: (d.escalated as boolean) ?? false,
    createdAt: d.created_at as string,
  }));
}
