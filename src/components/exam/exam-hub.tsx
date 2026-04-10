"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TARGET_EXAM_LABELS, type TargetExam } from "@/types/domain";
import { getExamSubjects } from "@/lib/exam";
import { BookOpen, GraduationCap, Award, School } from "lucide-react";

const EXAM_CONFIGS: Array<{
  type: TargetExam;
  icon: typeof BookOpen;
  color: string;
  bg: string;
}> = [
  { type: "CEPE", icon: BookOpen, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  { type: "CONCOURS_6EME", icon: School, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { type: "BEPC", icon: Award, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { type: "BAC", icon: GraduationCap, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
];

export function ExamHub() {
  const t = useTranslations("exam");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {EXAM_CONFIGS.map(({ type, icon: Icon, color, bg }) => {
        const subjects = getExamSubjects(type);
        return (
          <Link
            key={type}
            href={`/exams/${type}`}
            className={`group rounded-2xl border p-6 transition-all hover:shadow-lg ${bg}`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${color}`}>
                <Icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {TARGET_EXAM_LABELS[type]}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t("subjectsCount", { count: subjects.length })}
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--ev-blue)] transition-colors group-hover:text-[var(--ev-blue-light)]">
                  {t("startPractice")} →
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
