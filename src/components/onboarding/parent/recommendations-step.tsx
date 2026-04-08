"use client";

import { useTranslations } from "next-intl";
import {
  GRADE_GROUPS,
  GRADE_LEVEL_LABELS,
  SUBJECTS_BY_LEVEL,
  SUBJECT_LABELS,
} from "@/types/domain";
import type { GradeLevel, Subject } from "@/types/domain";
import type { ChildProfile } from "./add-child-step";
import { BookOpen, Sparkles } from "lucide-react";

type RecommendationsStepProps = {
  children: ChildProfile[];
};

function getGradeGroup(grade: GradeLevel): "primaire" | "college" | "lycee" {
  if ((GRADE_GROUPS.primaire as readonly string[]).includes(grade)) return "primaire";
  if ((GRADE_GROUPS.college as readonly string[]).includes(grade)) return "college";
  return "lycee";
}

export function RecommendationsStep({ children }: RecommendationsStepProps) {
  const t = useTranslations("onboarding.parent");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("recommendationsTitle")}</h2>
        <p className="text-sm text-slate-500">{t("recommendationsIntro")}</p>
      </div>

      {children.map((child) => {
        const group = getGradeGroup(child.grade_level);
        const subjects = [
          ...SUBJECTS_BY_LEVEL[group],
          ...SUBJECTS_BY_LEVEL.enrichment,
        ] as readonly Subject[];

        return (
          <div key={child.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                {t("subjectsFor", {
                  childName: child.first_name,
                  grade: GRADE_LEVEL_LABELS[child.grade_level],
                })}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {subjects.map((subject) => (
                <div
                  key={subject}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-3"
                >
                  <BookOpen className="size-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {SUBJECT_LABELS[subject]}
                    </p>
                    <p className="text-xs text-amber-600">{t("comingSoon")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
