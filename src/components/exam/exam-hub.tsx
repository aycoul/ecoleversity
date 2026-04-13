"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TARGET_EXAM_LABELS, EXAM_CATEGORY_LABELS, type TargetExam } from "@/types/domain";
import { getExamSubjects } from "@/lib/exam";
import { BookOpen, GraduationCap, Award, School, Globe, Plane, Languages, Trophy } from "lucide-react";

type ExamConfig = {
  type: TargetExam;
  icon: typeof BookOpen;
  color: string;
  bg: string;
};

const NATIONAL_EXAMS: ExamConfig[] = [
  { type: "CEPE", icon: BookOpen, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  { type: "CONCOURS_6EME", icon: School, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { type: "BEPC", icon: Award, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { type: "BAC", icon: GraduationCap, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
];

const INTERNATIONAL_EXAMS: ExamConfig[] = [
  { type: "IB_DIPLOMA", icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  { type: "SAT", icon: Plane, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { type: "TOEFL", icon: Languages, color: "text-teal-600", bg: "bg-teal-50 border-teal-200" },
  { type: "IELTS", icon: Trophy, color: "text-sky-600", bg: "bg-sky-50 border-sky-200" },
];

function ExamCard({ type, icon: Icon, color, bg, t }: ExamConfig & { t: ReturnType<typeof useTranslations> }) {
  const subjects = getExamSubjects(type);
  return (
    <Link
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
          {subjects.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              {t("subjectsCount", { count: subjects.length })}
            </p>
          )}
          <p className="mt-3 text-sm font-medium text-[var(--ev-blue)] transition-colors group-hover:text-[var(--ev-blue-light)]">
            {t("startPractice")} →
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ExamHub() {
  const t = useTranslations("exam");

  return (
    <div className="space-y-10">
      {/* National exams */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">{t("nationalExams")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {NATIONAL_EXAMS.map((exam) => (
            <ExamCard key={exam.type} {...exam} t={t} />
          ))}
        </div>
      </div>

      {/* International exams */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">{t("internationalExams")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {INTERNATIONAL_EXAMS.map((exam) => (
            <ExamCard key={exam.type} {...exam} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
