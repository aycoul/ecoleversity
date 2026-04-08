"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  UserCheck,
  FileCheck,
  CreditCard,
  ArrowRight,
  PartyPopper,
} from "lucide-react";

export function ReadyStep() {
  const t = useTranslations("onboarding.teacher");
  const router = useRouter();

  const checklist = [
    { icon: <UserCheck className="size-5 text-emerald-600" />, label: "Profil compl\u00e9t\u00e9" },
    { icon: <FileCheck className="size-5 text-emerald-600" />, label: "Documents envoy\u00e9s" },
    { icon: <CreditCard className="size-5 text-emerald-600" />, label: "Paiement configur\u00e9" },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-100">
        <PartyPopper className="size-10 text-emerald-600" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900">{t("readyTitle")}</h2>
      <p className="mt-2 max-w-md text-slate-600">{t("readyDesc")}</p>

      <div className="mt-6 w-full max-w-sm space-y-2">
        {checklist.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
          >
            <CheckCircle2 className="size-5 text-emerald-500" />
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              {item.icon}
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={() => router.push("/dashboard/teacher")}
        className="mt-8 bg-emerald-600 px-6 text-white hover:bg-emerald-700"
        size="lg"
      >
        Acc&eacute;der &agrave; mon tableau de bord
        <ArrowRight className="ml-2 size-4" data-icon="inline-end" />
      </Button>
    </div>
  );
}
