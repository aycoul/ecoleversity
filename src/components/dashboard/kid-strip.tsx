"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { GRADE_LEVEL_LABELS, type GradeLevel } from "@/types/domain";

// ─── Outschool-style kid strip ────────────────────────────────────────
// Horizontal, sticky at the top of every parent dashboard page. Shows
// every enrolled learner as a tappable card. Clicking a card switches
// the active learner context (via the existing /api/profile/switch
// endpoint) so the rest of the dashboard respects that selection.
//
// The "All" card corresponds to parent-mode (activeLearnerId === null) —
// effectively "show me everything across all my kids."
// ─────────────────────────────────────────────────────────────────────

export type KidStripLearner = {
  id: string;
  first_name: string;
  grade_level: GradeLevel;
  avatar_url: string | null;
};

export type KidStripStats = {
  upcomingCount: number;
  hasAlert: boolean;
};

export function KidStrip({
  learners,
  learnerStats,
  activeLearnerId,
}: {
  learners: KidStripLearner[];
  learnerStats: Record<string, KidStripStats>;
  activeLearnerId: string | null;
}) {
  const t = useTranslations("kidStrip");
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  async function switchTo(learnerId: string | null) {
    setSwitching(learnerId ?? "all");
    try {
      const res = await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learner_id: learnerId }),
      });
      if (!res.ok) throw new Error("switch_failed");
      // For the kid mode redirect, we hard-navigate so the /k/[id]
      // layout picks up. For "All" / parent mode we just refresh.
      if (learnerId) {
        router.push(`/k/${learnerId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setSwitching(null);
    }
  }

  // Hide entirely if the parent has no kids — the empty state is
  // handled by the main content area ("add your first child" CTA).
  if (learners.length === 0) return null;

  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:-mx-8 md:px-8">
      {/* All */}
      <button
        type="button"
        onClick={() => switchTo(null)}
        disabled={switching !== null}
        className={`group flex shrink-0 items-center gap-2.5 rounded-xl border-2 px-3 py-2 transition-all ${
          activeLearnerId === null
            ? "border-[var(--ev-blue)] bg-[var(--ev-blue)] text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        <div
          className={`flex size-10 items-center justify-center rounded-full ${
            activeLearnerId === null
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {switching === "all" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("allInitial")}
            </span>
          )}
        </div>
        <div className="min-w-0 text-left">
          <div className="text-sm font-semibold">{t("all")}</div>
          <div
            className={`text-[11px] leading-tight ${
              activeLearnerId === null ? "text-white/80" : "text-slate-500"
            }`}
          >
            {t("allSubtitle", { count: learners.length })}
          </div>
        </div>
      </button>

      {/* Each kid */}
      {learners.map((l) => {
        const active = activeLearnerId === l.id;
        const stats = learnerStats[l.id] ?? { upcomingCount: 0, hasAlert: false };
        const upcomingLabel =
          stats.upcomingCount === 0
            ? t("noUpcoming")
            : t("upcoming", { count: stats.upcomingCount });
        const isSwitching = switching === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => switchTo(l.id)}
            disabled={switching !== null}
            className={`relative flex shrink-0 items-center gap-2.5 rounded-xl border-2 px-3 py-2 transition-all ${
              active
                ? "border-[var(--ev-blue)] bg-[var(--ev-blue)] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <div
              className={`relative flex size-10 shrink-0 items-center justify-center rounded-full ${
                active
                  ? "bg-white/20"
                  : "bg-gradient-to-br from-[var(--ev-green)] to-[var(--ev-green-dark)] text-white"
              }`}
            >
              {isSwitching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : l.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.avatar_url}
                  alt={l.first_name}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="text-base font-bold">
                  {l.first_name[0].toUpperCase()}
                </span>
              )}
              {stats.hasAlert && !isSwitching && (
                <span
                  className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-red-500"
                  aria-label={t("hasAlert")}
                  title={t("hasAlertTooltip")}
                />
              )}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-semibold">{l.first_name}</div>
              <div
                className={`text-[11px] leading-tight ${
                  active ? "text-white/80" : "text-slate-500"
                }`}
              >
                {GRADE_LEVEL_LABELS[l.grade_level]} · {upcomingLabel}
              </div>
            </div>
          </button>
        );
      })}

      {/* Add kid */}
      <Link
        href="/dashboard/parent/children"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-[var(--ev-blue)] hover:text-[var(--ev-blue)]"
        title={t("addChild")}
        aria-label={t("addChild")}
      >
        <Plus className="size-5" />
      </Link>
    </div>
  );
}
