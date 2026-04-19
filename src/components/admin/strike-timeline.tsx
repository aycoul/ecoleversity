"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import type {
  StrikeLevel,
  TeacherStrikeGroup,
} from "@/lib/admin/strikes-data";

const LEVEL_BADGE: Record<StrikeLevel, { cls: string; label: string }> = {
  warning: { cls: "bg-amber-100 text-amber-800", label: "Avertissement" },
  strike_1: { cls: "bg-orange-100 text-orange-800", label: "Sanction 1" },
  strike_2: { cls: "bg-rose-100 text-rose-800", label: "Sanction 2" },
  strike_3: { cls: "bg-red-600 text-white", label: "Sanction 3 · Bannissement" },
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-600",
  appealed: "bg-blue-100 text-blue-700",
  revoked: "bg-emerald-100 text-emerald-700",
};

type Props = {
  group: TeacherStrikeGroup;
};

export function StrikeTimeline({ group }: Props) {
  const t = useTranslations("adminStrikes");
  const router = useRouter();
  const [expanded, setExpanded] = useState(group.activeStrikes > 0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function patchStrike(
    strikeId: string,
    action: "revoke" | "mark_appealed" | "mark_expired"
  ) {
    setPendingId(strikeId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/strikes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strikeId, action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "action_failed");
        }
        toast.success(t(`toast.${action}`));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {group.teacherName}
            </p>
            <p className="text-xs text-slate-500">
              {t("activeCount", { count: group.activeStrikes })} ·{" "}
              {t("totalCount", { count: group.totalStrikes })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.currentLevel && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_BADGE[group.currentLevel].cls}`}
            >
              {LEVEL_BADGE[group.currentLevel].label}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-slate-400" />
          ) : (
            <ChevronDown className="size-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <History className="size-3.5" />
            {t("historyLabel")}
          </div>
          <ol className="mt-3 space-y-3">
            {group.strikes.map((s) => {
              const issued = new Date(s.createdAt).toLocaleDateString(
                "fr-CI",
                { day: "numeric", month: "short", year: "numeric" }
              );
              const expires = s.expiresAt
                ? new Date(s.expiresAt).toLocaleDateString("fr-CI", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : t("permanent");
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_BADGE[s.strikeLevel].cls}`}
                      >
                        {LEVEL_BADGE[s.strikeLevel].label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status] ?? "bg-slate-100"}`}
                      >
                        {t(`status.${s.status}`)}
                      </span>
                    </div>
                    {s.status === "active" && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => patchStrike(s.id, "mark_appealed")}
                          disabled={isPending && pendingId === s.id}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <AlertOctagon className="size-3" />
                          {t("markAppealed")}
                        </button>
                        <button
                          type="button"
                          onClick={() => patchStrike(s.id, "revoke")}
                          disabled={isPending && pendingId === s.id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {isPending && pendingId === s.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Undo2 className="size-3" />
                          )}
                          {t("revoke")}
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-800">{s.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("issuedBy", { name: s.issuedByName ?? "—" })} ·{" "}
                    {t("issuedOn", { date: issued })} ·{" "}
                    {t("expires", { date: expires })}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
