"use client";

import { useTranslations } from "next-intl";
import { BookOpen, Monitor, Clock, Lightbulb } from "lucide-react";

export function FirstCourseStep() {
  const t = useTranslations("onboarding.teacher");

  const tips = [
    {
      icon: <Monitor className="size-5 text-[var(--ev-blue)]" />,
      title: "Bonne qualit\u00e9 vid\u00e9o",
      desc: "Utilisez un endroit bien \u00e9clair\u00e9, face \u00e0 une source de lumi\u00e8re naturelle",
    },
    {
      icon: <Clock className="size-5 text-[var(--ev-blue)]" />,
      title: "Dur\u00e9e recommand\u00e9e",
      desc: "Entre 30 et 60 minutes par session. Les \u00e9l\u00e8ves restent concentr\u00e9s.",
    },
    {
      icon: <Lightbulb className="size-5 text-[var(--ev-blue)]" />,
      title: "\u00c9quipement",
      desc: "Un t\u00e9l\u00e9phone avec cam\u00e9ra et micro suffit. Un casque am\u00e9liore la qualit\u00e9 audio.",
    },
    {
      icon: <BookOpen className="size-5 text-[var(--ev-blue)]" />,
      title: "Pr\u00e9paration",
      desc: "Pr\u00e9parez un plan de cours simple. Les parents appr\u00e9cient la structure.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("firstCourseTitle")}</h2>
        <p className="text-sm text-slate-500">{t("firstCourseDesc")}</p>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green-50)]">
              {tip.icon}
            </div>
            <div>
              <p className="font-medium text-slate-900">{tip.title}</p>
              <p className="text-sm text-slate-500">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-[var(--ev-green-50)] p-4 text-center text-sm text-[var(--ev-blue)]">
        La cr\u00e9ation de cours sera disponible apr\u00e8s la validation de votre profil.
      </div>
    </div>
  );
}
