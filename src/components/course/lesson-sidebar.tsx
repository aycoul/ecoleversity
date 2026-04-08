"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { CheckCircle, Clock, Award } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  video_duration_seconds: number;
  sort_order: number;
};

type LessonSidebarProps = {
  courseId: string;
  lessons: Lesson[];
  currentLessonId: string;
  completedLessonIds: Set<string>;
  progressPct: number;
};

export function LessonSidebar({
  courseId,
  lessons,
  currentLessonId,
  completedLessonIds,
  progressPct,
}: LessonSidebarProps) {
  const t = useTranslations("player");

  const completedCount = completedLessonIds.size;
  const totalCount = lessons.length;

  return (
    <div className="flex h-full flex-col">
      {/* Progress header */}
      <div className="border-b border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {t("progress", { percent: progressPct })}
          </span>
          <span className="text-xs text-slate-500">
            {t("lessonOf", { current: completedCount, total: totalCount })}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("lessons")}
          </h3>
          <div className="space-y-0.5">
            {lessons.map((lesson, index) => {
              const isCurrent = lesson.id === currentLessonId;
              const isCompleted = completedLessonIds.has(lesson.id);
              const durationMin = Math.ceil(
                lesson.video_duration_seconds / 60
              );

              return (
                <Link
                  key={lesson.id}
                  href={`/course/${courseId}/lesson/${lesson.id}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isCurrent
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {/* Number or checkmark */}
                  <div className="flex size-7 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle className="size-5 text-emerald-500" />
                    ) : (
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Title + duration */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        isCurrent ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="size-3" />
                      {durationMin} min
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Certificate button when 100% */}
      {progressPct >= 100 && (
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-center text-sm font-medium text-emerald-700">
            {t("courseCompleted")}
          </div>
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 opacity-60"
          >
            <Award className="size-4" />
            {t("getCertificate")}
          </button>
        </div>
      )}
    </div>
  );
}
