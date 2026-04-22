import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Cpu, Sparkles, MessageCircle } from "lucide-react";
import {
  loadAgentConfigs,
  loadAgentEscalations,
  loadRecentAgentAudit,
} from "@/lib/admin/agents-data";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { AgentCard } from "@/components/admin/agent-card";
import { AiSectionTabs } from "@/components/admin/ai-section-tabs";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();

  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (!profile || profile.role !== "admin" || !canAccess(scope, "agents")) {
    redirect("/dashboard/admin");
  }

  const t = await getTranslations("adminAgents");
  const [configs, escalations, recentAudit] = await Promise.all([
    loadAgentConfigs(),
    loadAgentEscalations(),
    loadRecentAgentAudit(30),
  ]);

  const ceo = configs.find((c) => c.agentName === "ceo");
  const lieutenants = configs.filter((c) => c.agentName !== "ceo");
  const canMutate = scope === "founder";

  return (
    <div className="space-y-8 pb-16">
      <AiSectionTabs />
      <div className="flex items-center gap-3">
        <Cpu className="size-7 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
      </div>

      {/* Le Patron (CEO) — top banner */}
      {ceo && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-3xl">
              {ceo.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">Le Patron</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    ceo.isActive
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      ceo.isActive ? "bg-emerald-400" : "bg-white/40"
                    }`}
                  />
                  {ceo.isActive ? t("status.running") : t("status.off")}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/80">{ceo.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70">
                <span>
                  {t("metric.decisions")}: <b className="text-white">{ceo.todayDecisions}</b>
                </span>
                <span>
                  {t("metric.escalations")}: <b className="text-white">{ceo.todayEscalated}</b>
                </span>
              </div>
            </div>
            {canMutate && (
              <button
                type="button"
                disabled
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/70 backdrop-blur"
                title={t("whatsappReportSoon")}
              >
                <MessageCircle className="size-3.5" />
                {t("askWhatsappReport")}
              </button>
            )}
          </div>
          {!ceo.isActive && (
            <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
              <Sparkles className="mr-1 inline size-3" />
              {t("phase7Notice")}
            </p>
          )}
        </section>
      )}

      {/* 5 lieutenants grid */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t("lieutenantsTitle")}
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {lieutenants.map((cfg) => (
            <AgentCard key={cfg.id} config={cfg} canMutate={canMutate} />
          ))}
        </div>
      </section>

      {/* Escalation queue */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t("escalationQueue")}
        </h2>
        {escalations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {t("queueEmpty")}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {t("queueEmptyHelper")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {escalations.map((esc) => (
              <div
                key={esc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {esc.agentName} · {esc.actionType}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t("confidence")}:{" "}
                    {esc.confidenceScore !== null
                      ? `${Math.round(esc.confidenceScore * 100)}%`
                      : "—"}
                    {esc.targetTable && ` · ${esc.targetTable}`}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(esc.createdAt).toLocaleString("fr-CI", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit log preview */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t("auditLogTitle")}
        </h2>
        {recentAudit.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">{t("auditEmpty")}</p>
            <p className="mt-1 text-xs text-slate-400">
              {t("auditEmptyHelper")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("table.when")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("table.agent")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("table.action")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("table.decision")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.confidence")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentAudit.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleString("fr-CI", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 text-xs font-medium">
                      {row.agentName}
                    </td>
                    <td className="px-4 py-2 text-xs">{row.actionType}</td>
                    <td className="px-4 py-2 text-xs">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          row.decision === "escalated"
                            ? "bg-amber-100 text-amber-800"
                            : row.decision === "auto_rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {row.decision}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-mono">
                      {row.confidenceScore !== null
                        ? `${Math.round(row.confidenceScore * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Phase 7 notice */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">{t("phase7Header")}</p>
        <p className="mt-1">{t("phase7Body")}</p>
      </section>
    </div>
  );
}
