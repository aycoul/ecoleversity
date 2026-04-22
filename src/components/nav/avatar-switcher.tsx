"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, LogOut, Plus, Settings } from "lucide-react";
import { GRADE_LEVEL_LABELS, type GradeLevel } from "@/types/domain";
import { useLogout } from "@/hooks/use-logout";

export type AvatarSwitcherLearner = {
  id: string;
  first_name: string;
  grade_level: GradeLevel;
  avatar_url: string | null;
};

export type AvatarSwitcherProps = {
  userName: string;
  userInitial: string;
  activeLearnerId: string | null;
  learners: AvatarSwitcherLearner[];
  isParent: boolean;
};

export function AvatarSwitcher({
  userName,
  userInitial,
  activeLearnerId,
  learners,
  isParent,
}: AvatarSwitcherProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const switchTo = async (learnerId: string | null) => {
    setSwitching(learnerId ?? "parent");
    try {
      const res = await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learner_id: learnerId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "switch_failed");
      }
      setOpen(false);
      if (learnerId) {
        router.push(`/k/${learnerId}`);
      } else {
        router.push("/dashboard/parent/overview");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setSwitching(null);
    }
  };

  const activeLearner = learners.find((l) => l.id === activeLearnerId);
  const displayName = activeLearner?.first_name ?? userName;
  const displayInitial = activeLearner
    ? activeLearner.first_name[0].toUpperCase()
    : userInitial;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 hover:bg-slate-100 transition-colors"
        aria-label="Profile switcher"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-[var(--ev-blue)] text-sm font-bold text-white">
          {displayInitial}
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:inline">
          {displayName}
        </span>
        <ChevronDown className="size-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
          {/* Parent self row */}
          <button
            onClick={() => switchTo(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${
              activeLearnerId === null ? "bg-[var(--ev-green-50)]" : ""
            }`}
            disabled={switching !== null}
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-[var(--ev-blue)] text-sm font-bold text-white">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{userName}</div>
              <div className="text-xs text-slate-500">
                {isParent ? t("parentMode") : userName}
              </div>
            </div>
            {activeLearnerId === null && (
              <div className="size-2 rounded-full bg-[var(--ev-green)]" />
            )}
          </button>

          {/* Learners (only if parent) */}
          {isParent && learners.length > 0 && (
            <>
              <div className="border-t border-slate-100" />
              {learners.map((learner) => (
                <button
                  key={learner.id}
                  onClick={() => switchTo(learner.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${
                    activeLearnerId === learner.id ? "bg-[var(--ev-green-50)]" : ""
                  }`}
                  disabled={switching !== null}
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-[var(--ev-green)] text-sm font-bold text-white">
                    {learner.first_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {learner.first_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {GRADE_LEVEL_LABELS[learner.grade_level]}
                    </div>
                  </div>
                  {activeLearnerId === learner.id && (
                    <div className="size-2 rounded-full bg-[var(--ev-green)]" />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Parent actions */}
          {isParent && (
            <>
              <div className="border-t border-slate-100" />
              <a
                href="/dashboard/parent/children"
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Plus className="size-4" />
                {t("addChild")}
              </a>
            </>
          )}

          <div className="border-t border-slate-100" />
          <a
            href={isParent ? "/dashboard/parent/settings" : "/dashboard/settings"}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Settings className="size-4" />
            {t("settings")}
          </a>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg text-left"
          >
            <LogOut className="size-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
