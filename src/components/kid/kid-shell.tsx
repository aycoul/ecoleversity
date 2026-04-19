"use client";

import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import {
  Home,
  Video,
  PlayCircle,
  Award,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import { GRADE_LEVEL_LABELS, type GradeLevel } from "@/types/domain";

type KidShellLearner = {
  id: string;
  first_name: string;
  grade_level: string;
  avatar_url: string | null;
};

type KidShellProps = {
  learners: KidShellLearner[];
  children: React.ReactNode;
};

export function KidShell({ learners, children }: KidShellProps) {
  const t = useTranslations("common");
  const params = useParams<{ learner_id?: string }>();
  const activeLearnerId = params?.learner_id;
  const activeLearner = learners.find((l) => l.id === activeLearnerId);
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const returnToParent = async () => {
    setSwitching(true);
    try {
      const res = await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learner_id: null }),
      });
      if (!res.ok) throw new Error("switch_failed");
      router.push("/dashboard/parent/overview");
      router.refresh();
    } catch {
      toast.error("Erreur");
      setSwitching(false);
    }
  };

  if (!activeLearner) {
    // Shouldn't happen — middleware blocks this — but render a safe fallback
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <p className="text-slate-500">Profil introuvable</p>
        <button
          onClick={returnToParent}
          className="mt-4 text-[var(--ev-blue)] hover:underline"
        >
          Retour au mode parent
        </button>
      </div>
    );
  }

  const navLinks = [
    { href: `/k/${activeLearner.id}`, label: "Accueil", icon: Home },
    {
      href: `/k/${activeLearner.id}/classes`,
      label: "Mes classes",
      icon: Video,
    },
    {
      href: `/k/${activeLearner.id}/courses`,
      label: "Mes cours",
      icon: PlayCircle,
    },
    {
      href: `/k/${activeLearner.id}/achievements`,
      label: "Mes succès",
      icon: Award,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--ev-blue-50)]/30 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={`/k/${activeLearner.id}`} className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="écoleVersity"
              width={140}
              height={36}
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex size-9 items-center justify-center rounded-full bg-[var(--ev-green)] text-sm font-bold text-white">
                {activeLearner.first_name[0].toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {activeLearner.first_name}
                </div>
                <div className="text-xs text-slate-500">
                  {GRADE_LEVEL_LABELS[activeLearner.grade_level as GradeLevel] ??
                    activeLearner.grade_level}
                </div>
              </div>
            </div>
            <button
              onClick={returnToParent}
              disabled={switching}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {switching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="size-4" />
              )}
              <span className="hidden sm:inline">{t("parentMode")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <ul className="flex items-center justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 text-[0.65rem] text-slate-500 hover:text-[var(--ev-blue)]"
                >
                  <Icon className="size-5" />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
