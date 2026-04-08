"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BookOpen, Clock, Star, Users } from "lucide-react";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Button } from "@/components/ui/button";

export type CourseCardData = {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  price_xof: number;
  thumbnail_url: string | null;
  teacher_name: string;
  teacher_avatar: string | null;
  rating_avg: number;
  rating_count: number;
  enrollment_count: number;
  lesson_count: number;
  total_duration_minutes: number;
};

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  francais: { bg: "bg-blue-100", text: "text-blue-700" },
  mathematiques: { bg: "bg-purple-100", text: "text-purple-700" },
  sciences: { bg: "bg-green-100", text: "text-green-700" },
  anglais: { bg: "bg-red-100", text: "text-red-700" },
  physique_chimie: { bg: "bg-orange-100", text: "text-orange-700" },
  svt: { bg: "bg-teal-100", text: "text-teal-700" },
};

function getSubjectGradient(subject: string): string {
  const gradients: Record<string, string> = {
    francais: "from-blue-400 to-blue-600",
    mathematiques: "from-purple-400 to-purple-600",
    sciences: "from-green-400 to-green-600",
    anglais: "from-red-400 to-red-600",
    physique_chimie: "from-orange-400 to-orange-600",
    svt: "from-teal-400 to-teal-600",
    histoire_geo: "from-amber-400 to-amber-600",
    philosophie: "from-indigo-400 to-indigo-600",
  };
  return gradients[subject] ?? "from-slate-400 to-slate-600";
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const t = useTranslations("courseCatalog");

  const hours = Math.floor(course.total_duration_minutes / 60);
  const minutes = course.total_duration_minutes % 60;

  const subjectColor = SUBJECT_COLORS[course.subject] ?? {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Thumbnail or gradient placeholder */}
      <div className="relative h-36 w-full">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="size-full object-cover"
          />
        ) : (
          <div
            className={`flex size-full items-center justify-center bg-gradient-to-br ${getSubjectGradient(course.subject)}`}
          >
            <BookOpen className="size-10 text-white/80" />
          </div>
        )}
        {/* Lesson count badge */}
        <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {t("lessons", { count: course.lesson_count })}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 line-clamp-2 leading-snug">
          {course.title}
        </h3>

        {/* Teacher */}
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-500">
            {course.teacher_avatar ? (
              <img
                src={course.teacher_avatar}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              course.teacher_name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-sm text-slate-600">{course.teacher_name}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${subjectColor.bg} ${subjectColor.text}`}
          >
            {SUBJECT_LABELS[course.subject as Subject] ?? course.subject}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {GRADE_LEVEL_LABELS[course.grade_level as GradeLevel] ??
              course.grade_level}
          </span>
        </div>

        {/* Rating + Duration */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            {course.rating_count > 0 ? (
              <>
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-slate-700">
                  {Number(course.rating_avg).toFixed(1)}
                </span>
                <span>({course.rating_count})</span>
              </>
            ) : (
              <span className="text-xs text-slate-400">--</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="size-3.5" />
            <span>
              {t("totalDuration", { hours, minutes })}
            </span>
          </div>
        </div>

        {/* Enrolled */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Users className="size-3" />
          {t("enrolledStudents", { count: course.enrollment_count })}
        </div>

        {/* Price */}
        <div className="text-base font-bold text-slate-800">
          {course.price_xof.toLocaleString("fr-CI")} FCFA
        </div>
      </div>

      {/* Action */}
      <div className="border-t border-slate-100 p-3">
        <Link href={`/courses/${course.id}`} className="block">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
            {t("viewCourse")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
