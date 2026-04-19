"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CircleOff,
  Loader2,
  Power,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { AgentConfigRow } from "@/lib/admin/agents-data";

type Props = {
  config: AgentConfigRow;
  /** Founder-only controls (toggle, threshold slider). Non-founder gets read-only. */
  canMutate: boolean;
};

export function AgentCard({ config, canMutate }: Props) {
  const t = useTranslations("adminAgents");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [threshold, setThreshold] = useState(config.confidenceThreshold);
  const [active, setActive] = useState(config.isActive);

  async function patch(update: {
    isActive?: boolean;
    confidenceThreshold?: number;
  }) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/agents/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentName: config.agentName,
            ...update,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "update_failed");
        }
        toast.success(t("toast.updated"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  const statusTone = !active
    ? "bg-slate-100 text-slate-500"
    : config.todayEscalated > 0
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  const statusLabel = !active
    ? t("status.off")
    : config.todayEscalated > 0
      ? t("status.needsAttention")
      : t("status.running");

  const lastActiveLabel = config.lastDecisionAt
    ? new Date(config.lastDecisionAt).toLocaleString("fr-CI", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("neverActive");

  return (
    <div
      className={`rounded-xl border bg-white p-5 transition-colors ${
        active ? "border-slate-200" : "border-slate-200 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ev-blue-50)] text-2xl">
            {config.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {config.label}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusTone}`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    active ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{config.description}</p>
          </div>
        </div>

        {canMutate && (
          <button
            type="button"
            onClick={() => {
              const next = !active;
              setActive(next);
              patch({ isActive: next });
            }}
            disabled={isPending}
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
              active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
            title={active ? t("toggleOff") : t("toggleOn")}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : active ? (
              <Power className="size-4" />
            ) : (
              <CircleOff className="size-4" />
            )}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-xs">
        <Metric
          icon={Activity}
          label={t("metric.decisions")}
          value={config.todayDecisions}
        />
        <Metric
          icon={AlertTriangle}
          label={t("metric.escalations")}
          value={config.todayEscalated}
          tone={config.todayEscalated > 0 ? "amber" : "slate"}
        />
        <Metric
          icon={Sparkles}
          label={t("metric.confidence")}
          value={
            config.avgConfidenceToday !== null
              ? `${Math.round(config.avgConfidenceToday * 100)}%`
              : "—"
          }
        />
      </div>

      {/* Threshold slider (founder only) */}
      {canMutate && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Sliders className="size-3" />
              {t("threshold")}
            </label>
            <span className="text-xs font-semibold text-slate-900">
              {Math.round(threshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="0.99"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            onMouseUp={() =>
              threshold !== config.confidenceThreshold &&
              patch({ confidenceThreshold: threshold })
            }
            onTouchEnd={() =>
              threshold !== config.confidenceThreshold &&
              patch({ confidenceThreshold: threshold })
            }
            disabled={isPending}
            className="mt-2 w-full accent-[var(--ev-blue)]"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            {t("thresholdHelper")}
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400">
        {active ? t("lastActive", { time: lastActiveLabel }) : t("standbyHelper")}
      </p>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone?: "slate" | "amber";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-700" : "text-slate-700";
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-400">
        <Icon className="size-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
