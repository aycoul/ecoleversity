"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Users, CalendarDays, Wallet, ArrowRight, PartyPopper } from "lucide-react";

export function DashboardTourStep() {
  const t = useTranslations("onboarding.parent");
  const router = useRouter();

  const cards = [
    {
      icon: <Users className="size-6 text-[var(--ev-blue)]" />,
      title: t("tourCard1Title"),
      desc: t("tourCard1Desc"),
    },
    {
      icon: <CalendarDays className="size-6 text-[var(--ev-blue)]" />,
      title: t("tourCard2Title"),
      desc: t("tourCard2Desc"),
    },
    {
      icon: <Wallet className="size-6 text-[var(--ev-blue)]" />,
      title: t("tourCard3Title"),
      desc: t("tourCard3Desc"),
    },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[var(--ev-green)]/10">
        <PartyPopper className="size-10 text-[var(--ev-blue)]" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900">{t("tourTitle")}</h2>
      <p className="mt-2 max-w-md text-slate-600">{t("tourDesc")}</p>

      <div className="mt-6 w-full max-w-md space-y-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-lg border border-slate-100 bg-white p-4 text-left"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--ev-green-50)]">
              {card.icon}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{card.title}</p>
              <p className="text-sm text-slate-500">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => router.push("/dashboard/parent")}
        className="mt-8 bg-[var(--ev-blue)] px-6 text-white hover:bg-[var(--ev-blue-light)]"
        size="lg"
      >
        {t("goToDashboard")}
        <ArrowRight className="ml-2 size-4" data-icon="inline-end" />
      </Button>
    </div>
  );
}
