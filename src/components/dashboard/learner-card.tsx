import Link from "next/link";
import { BookOpen, Calendar, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GRADE_LEVEL_LABELS, type GradeLevel } from "@/types/domain";

export type LearnerCardProps = {
  learner: {
    id: string;
    first_name: string;
    grade_level: GradeLevel;
    avatar_url: string | null;
  };
  enrolledCount: number;
  nextSessionAt: Date | null;
  locale: string;
};

export async function LearnerCard({
  learner,
  enrolledCount,
  nextSessionAt,
  locale,
}: LearnerCardProps) {
  const t = await getTranslations("dashboardCommon");
  const nextSessionLabel = nextSessionAt
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(nextSessionAt)
    : null;

  return (
    <Link
      href={`/k/${learner.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-[var(--ev-green)] hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green)] text-xl font-bold text-white">
          {learner.first_name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{learner.first_name}</h3>
            <ChevronRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ev-blue)]" />
          </div>
          <p className="text-sm text-slate-500">
            {GRADE_LEVEL_LABELS[learner.grade_level]}
          </p>
          <div className="mt-3 flex gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {t("courseCount", { count: enrolledCount })}
            </div>
            {nextSessionLabel && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {t("nextSession", { when: nextSessionLabel })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
