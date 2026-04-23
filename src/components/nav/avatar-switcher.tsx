"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, Link } from "@/i18n/routing";
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
  role?: "admin" | "teacher" | "school_admin" | "parent";
  /** Dropdown opens downward (top placement) or upward (bottom placement). */
  dropdownPosition?: "top" | "bottom";
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  teacher: "Enseignant",
  school_admin: "Admin école",
  parent: "Parent",
};

export function AvatarSwitcher({
  userName,
  userInitial,
  activeLearnerId,
  learners,
  isParent,
  role = "parent",
  dropdownPosition = "bottom",
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
        <div className={`absolute right-0 ${dropdownPosition === "top" ? "top-full mt-2" : "bottom-full mb-2"} w-64 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden`}>
          {/* ── Section 1: Parent account ────────────────────────────── */}
          {isParent ? (
            <>
              <div className="bg-slate-50 px-3 pt-2.5 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                Compte parent
              </div>
              <button
                onClick={() => switchTo(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${
                  activeLearnerId === null ? "bg-[var(--ev-blue-50)]" : ""
                }`}
                disabled={switching !== null}
              >
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--ev-blue)] text-sm font-bold text-white">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{userName}</div>
                  <div className="text-xs text-slate-500">{t("parentMode")}</div>
                </div>
                {activeLearnerId === null && (
                  <div className="size-2 rounded-full bg-[var(--ev-blue)]" />
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-[var(--ev-blue)] text-sm font-bold text-white">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{userName}</div>
                <div className="text-xs text-slate-500">{ROLE_LABEL[role] ?? role}</div>
              </div>
            </div>
          )}

          {/* ── Section 2: Kid profiles (prominent, kid-friendly) ─────── */}
          {isParent && (
            <>
              <div className="border-t border-slate-100" />
              <div className="bg-[var(--ev-green-50)] px-3 pt-2.5 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--ev-green-dark)]">
                Mode enfant
              </div>
              {learners.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500">
                  Aucun enfant enregistré. Ajoutez un profil pour activer le mode enfant.
                </div>
              ) : (
                learners.map((learner) => (
                  <button
                    key={learner.id}
                    onClick={() => switchTo(learner.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--ev-green-50)]/60 ${
                      activeLearnerId === learner.id ? "bg-[var(--ev-green-50)]" : ""
                    }`}
                    disabled={switching !== null}
                  >
                    <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ev-green)] to-[var(--ev-green-dark)] text-base font-bold text-white shadow-sm ring-2 ring-white">
                      {learner.first_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {learner.first_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {GRADE_LEVEL_LABELS[learner.grade_level]}
                      </div>
                    </div>
                    {activeLearnerId === learner.id && (
                      <div className="rounded-full bg-[var(--ev-green)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                        Actif
                      </div>
                    )}
                  </button>
                ))
              )}
              <Link
                href="/dashboard/parent/children"
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--ev-blue)] hover:bg-slate-50"
              >
                <Plus className="size-4" />
                {t("addChild")}
              </Link>
            </>
          )}

          {/* ── Section 3: Account actions ──────────────────────────── */}
          <div className="border-t border-slate-100" />
          <Link
            href="/dashboard/settings/notifications"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Settings className="size-4" />
            {t("settings")}
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
          >
            <LogOut className="size-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
