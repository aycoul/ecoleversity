"use client";

import { useTranslations } from "next-intl";
import { Heart, ShieldCheck, BookOpen, BarChart3 } from "lucide-react";

export function WelcomeStep() {
  const t = useTranslations("onboarding.parent");

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-100">
        <Heart className="size-10 text-emerald-600" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900">{t("welcomeTitle")}</h2>
      <p className="mt-2 max-w-md text-slate-600">{t("welcomeDesc")}</p>

      <div className="mt-8 grid w-full max-w-md gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <ShieldCheck className="size-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{t("welcomeBenefit1")}</p>
            <p className="text-sm text-slate-500">{t("welcomeBenefit1Desc")}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <BookOpen className="size-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{t("welcomeBenefit2")}</p>
            <p className="text-sm text-slate-500">{t("welcomeBenefit2Desc")}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <BarChart3 className="size-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{t("welcomeBenefit3")}</p>
            <p className="text-sm text-slate-500">{t("welcomeBenefit3Desc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
