"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  Users,
  GraduationCap,
  Tag,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

type Recommendation = {
  title: string;
  category: "revenue" | "retention" | "teacher_help" | "pricing" | "operations" | string;
  priority: "high" | "medium" | "low" | string;
  rationale: string;
  action: string;
};

type Insights = {
  diagnosis: string;
  growthSignals?: Array<{ signal: string; evidence: string }>;
  recommendations: Recommendation[];
};

const CATEGORY_META: Record<string, { icon: React.ElementType; tone: string; label: string }> = {
  revenue: { icon: TrendingUp, tone: "bg-emerald-50 text-emerald-700", label: "Revenu" },
  retention: { icon: Users, tone: "bg-blue-50 text-blue-700", label: "Rétention" },
  teacher_help: { icon: GraduationCap, tone: "bg-violet-50 text-violet-700", label: "Enseignants" },
  pricing: { icon: Tag, tone: "bg-amber-50 text-amber-700", label: "Tarification" },
  operations: { icon: Wrench, tone: "bg-slate-100 text-slate-700", label: "Opérations" },
};

const PRIORITY_TONE: Record<string, string> = {
  high: "border-rose-300 bg-rose-50 text-rose-800",
  medium: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

export function FinanceInsightsPanel({
  days,
  granularity,
  compareMode,
}: {
  days: number;
  granularity: string;
  compareMode: string;
}) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [compareLabel, setCompareLabel] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, granularity, compareMode }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error ?? "Échec");
        return;
      }
      setInsights(j.insights as Insights);
      setGeneratedAt(j.generatedAt);
      setCompareLabel(j.compareLabel);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--ev-blue)]/20 bg-gradient-to-br from-[var(--ev-blue-50)]/40 to-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="size-4 text-[var(--ev-blue)]" />
            Insights IA — Recommandations
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Une analyse rapide par Claude Haiku basée sur les chiffres ci-dessus.
            Conseils croissance, rétention, support enseignants, tarification.
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
          className="bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
        >
          {loading ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 size-4" />
          )}
          {insights ? "Régénérer" : "Générer l'analyse"}
        </Button>
      </div>

      {!insights && !loading && (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-400">
          Cliquez sur &laquo; Générer l&apos;analyse &raquo; pour produire des recommandations
          personnalisées basées sur la période sélectionnée.
        </p>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Analyse en cours — ~5 secondes…
        </div>
      )}

      {insights && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[var(--ev-blue)]/30 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ev-blue)]">
              Diagnostic
            </p>
            <p className="mt-1 text-sm text-slate-800">{insights.diagnosis}</p>
            {compareLabel && (
              <p className="mt-2 text-xs text-slate-400">{compareLabel}</p>
            )}
          </div>

          {insights.growthSignals && insights.growthSignals.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Signaux de croissance
              </p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                {insights.growthSignals.map((s, i) => (
                  <li key={i}>
                    <strong>{s.signal}</strong> — <span className="text-emerald-800/80">{s.evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Recommandations ({insights.recommendations.length})
            </p>
            {insights.recommendations.map((r, i) => {
              const meta = CATEGORY_META[r.category] ?? CATEGORY_META.operations;
              const Icon = meta.icon;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 transition-colors ${PRIORITY_TONE[r.priority] ?? PRIORITY_TONE.low}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${meta.tone}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold">{r.title}</h4>
                        <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-medium uppercase">
                          {r.priority}
                        </span>
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">{r.rationale}</p>
                      <div className="flex items-start gap-1 rounded-md bg-white/80 p-2 text-xs text-slate-800">
                        <ArrowRight className="mt-0.5 size-3 shrink-0 text-slate-500" />
                        <span><strong>Action :</strong> {r.action}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {generatedAt && (
            <p className="text-right text-[10px] text-slate-400">
              Généré le {new Date(generatedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
