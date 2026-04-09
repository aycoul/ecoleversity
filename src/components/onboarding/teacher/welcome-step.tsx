"use client";

import { useTranslations } from "next-intl";
import { GraduationCap, Users, BookOpen, Wallet } from "lucide-react";

export function WelcomeStep() {
  const t = useTranslations("onboarding.teacher");

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-[var(--ev-green)]/10">
        <GraduationCap className="size-10 text-[var(--ev-blue)]" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900">{t("welcomeTitle")}</h2>
      <p className="mt-2 max-w-md text-slate-600">{t("welcomeDesc")}</p>

      <div className="mt-8 grid w-full max-w-md gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green-50)]">
            <Users className="size-5 text-[var(--ev-blue)]" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Des milliers de parents</p>
            <p className="text-sm text-slate-500">
              cherchent des enseignants qualifi&eacute;s chaque jour
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green-50)]">
            <BookOpen className="size-5 text-[var(--ev-blue)]" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Enseignez en ligne</p>
            <p className="text-sm text-slate-500">
              depuis chez vous, &agrave; votre rythme
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green-50)]">
            <Wallet className="size-5 text-[var(--ev-blue)]" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Paiement chaque semaine</p>
            <p className="text-sm text-slate-500">
              via Orange Money ou Wave
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
