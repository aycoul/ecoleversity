"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { VideoPlayer } from "./video-player";
import { LessonSidebar } from "./lesson-sidebar";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  video_url: string | null;
  video_duration_seconds: number;
  pdf_attachment_url: string | null;
  sort_order: number;
  is_preview: boolean;
};

type CoursePlayerProps = {
  courseId: string;
  courseTitle: string;
  lessons: Lesson[];
  currentLesson: Lesson;
  enrollmentId: string | null;
  initialCompletedLessonIds: string[];
  initialProgressPct: number;
};

export function CoursePlayer({
  courseId,
  courseTitle,
  lessons,
  currentLesson,
  enrollmentId,
  initialCompletedLessonIds,
  initialProgressPct,
}: CoursePlayerProps) {
  const t = useTranslations("player");
  const router = useRouter();

  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(initialCompletedLessonIds)
  );
  const [progressPct, setProgressPct] = useState(initialProgressPct);
  const [isMarking, setIsMarking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentIndex = lessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const isCurrentCompleted = completedIds.has(currentLesson.id);

  const markLessonComplete = useCallback(
    async (lessonId: string) => {
      if (!enrollmentId || completedIds.has(lessonId)) return;

      try {
        const res = await fetch("/api/courses/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollmentId,
            lessonId,
            completed: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCompletedIds((prev) => new Set([...prev, lessonId]));
          setProgressPct(data.progressPct);
        }
      } catch (err) {
        console.error("Failed to mark lesson complete:", err);
      }
    },
    [enrollmentId, completedIds]
  );

  const handleVideoComplete = useCallback(() => {
    markLessonComplete(currentLesson.id);
  }, [currentLesson.id, markLessonComplete]);

  const handleManualComplete = async () => {
    setIsMarking(true);
    await markLessonComplete(currentLesson.id);
    setIsMarking(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 lg:hidden"
      >
        {sidebarOpen ? (
          <X className="size-4" />
        ) : (
          <Menu className="size-4" />
        )}
        {t("lessons")} ({completedIds.size}/{lessons.length})
      </button>

      {/* Sidebar - desktop: left, mobile: collapsible */}
      <div
        className={`w-full shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all lg:block lg:w-80 ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <LessonSidebar
          courseId={courseId}
          lessons={lessons}
          currentLessonId={currentLesson.id}
          completedLessonIds={completedIds}
          progressPct={progressPct}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          {/* Video player */}
          {currentLesson.video_url ? (
            <VideoPlayer
              videoUrl={currentLesson.video_url}
              lessonId={currentLesson.id}
              enrollmentId={enrollmentId}
              durationSeconds={currentLesson.video_duration_seconds}
              onComplete={handleVideoComplete}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-200 text-slate-400">
              <p className="text-sm">{t("lessons")}</p>
            </div>
          )}

          {/* Lesson info */}
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs text-slate-400">
                {t("lessonOf", {
                  current: currentIndex + 1,
                  total: lessons.length,
                })}
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {currentLesson.title}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{courseTitle}</p>
            </div>

            {currentLesson.description && (
              <p className="text-sm leading-relaxed text-slate-600">
                {currentLesson.description}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Mark complete button */}
              {enrollmentId && (
                <Button
                  onClick={handleManualComplete}
                  disabled={isCurrentCompleted || isMarking}
                  variant={isCurrentCompleted ? "outline" : "default"}
                  className={
                    isCurrentCompleted
                      ? "border-emerald-200 text-emerald-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }
                >
                  {isMarking ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 size-4" />
                  )}
                  {isCurrentCompleted ? t("completed") : t("markComplete")}
                </Button>
              )}

              {/* PDF download */}
              {currentLesson.pdf_attachment_url && (
                <a
                  href={currentLesson.pdf_attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <Download className="mr-2 size-4" />
                    {t("downloadPdf")}
                  </Button>
                </a>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              {prevLesson ? (
                <Button
                  variant="ghost"
                  onClick={() =>
                    router.push(
                      `/course/${courseId}/lesson/${prevLesson.id}`
                    )
                  }
                >
                  <ChevronLeft className="mr-1 size-4" />
                  {t("previousLesson")}
                </Button>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Button
                  onClick={() =>
                    router.push(
                      `/course/${courseId}/lesson/${nextLesson.id}`
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {t("nextLesson")}
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : progressPct >= 100 ? (
                <div className="text-sm font-medium text-emerald-700">
                  {t("courseCompleted")}
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
