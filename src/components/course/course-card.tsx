"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BookOpen, Clock, Star, Users } from "lucide-react";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const SUBJECT_ACCENT: Record<string, { border: string; gradient: string; light: string }> = {
  francais: { border: "border-blue-500", gradient: "from-blue-500 to-blue-700", light: "bg-blue-50 text-blue-700" },
  mathematiques: { border: "border-purple-500", gradient: "from-purple-500 to-purple-700", light: "bg-purple-50 text-purple-700" },
  sciences: { border: "border-emerald-500", gradient: "from-emerald-500 to-emerald-700", light: "bg-emerald-50 text-emerald-700" },
  anglais: { border: "border-rose-500", gradient: "from-rose-500 to-rose-700", light: "bg-rose-50 text-rose-700" },
  physique_chimie: { border: "border-orange-500", gradient: "from-orange-500 to-orange-700", light: "bg-orange-50 text-orange-700" },
  svt: { border: "border-teal-500", gradient: "from-teal-500 to-teal-700", light: "bg-teal-50 text-teal-700" },
  histoire_geo: { border: "border-amber-500", gradient: "from-amber-500 to-amber-700", light: "bg-amber-50 text-amber-700" },
  philosophie: { border: "border-indigo-500", gradient: "from-indigo-500 to-indigo-700", light: "bg-indigo-50 text-indigo-700" },
};

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i < fullStars;
        const isHalf = i === fullStars && hasHalf;
        return (
          <Star
            key={i}
            className={`size-3.5 ${
              isFilled
                ? "fill-amber-400 text-amber-400"
                : isHalf
                ? "fill-amber-400/50 text-amber-400"
                : "fill-slate-200 text-slate-200"
            }`}
          />
        );
      })}
    </div>
  );
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const t = useTranslations("courseCatalog");

  const hours = Math.floor(course.total_duration_minutes / 60);
  const minutes = course.total_duration_minutes % 60;

  const accent = SUBJECT_ACCENT[course.subject] ?? {
    border: "border-[var(--ev-blue)]",
    gradient: "from-[var(--ev-blue)] to-[var(--ev-blue-dark)]",
    light: "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]",
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--ev-blue)]/8">
      {/* Thumbnail */}
      <div className="relative h-40 w-full overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div
            className={`flex size-full items-center justify-center bg-gradient-to-br ${accent.gradient}`}
          >
            <BookOpen className="size-12 text-white/70" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Lesson count badge */}
        <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {t("lessons", { count: course.lesson_count })}
        </div>

        {/* Subject badge on image */}
        <div className="absolute left-3 top-3">
          <span className={`inline-flex items-center rounded-lg border-l-4 ${accent.border} bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-800 backdrop-blur-sm shadow-sm`}>
            {SUBJECT_LABELS[course.subject as Subject] ?? course.subject}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-slate-900 line-clamp-2 leading-snug text-[15px]">
          {course.title}
        </h3>

        {/* Teacher */}
        <div className="flex items-center gap-2.5">
          <Avatar className="size-7">
            <AvatarImage src={course.teacher_avatar ?? undefined} alt={course.teacher_name} />
            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
              {course.teacher_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-slate-600 font-medium">{course.teacher_name}</span>
        </div>

        {/* Grade + enrolled */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${accent.light}`}>
            {GRADE_LEVEL_LABELS[course.grade_level as GradeLevel] ?? course.grade_level}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Users className="size-3" />
            {t("enrolledStudents", { count: course.enrollment_count })}
          </span>
        </div>

        {/* Rating + Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {course.rating_count > 0 ? (
              <>
                <StarRating rating={course.rating_avg} />
                <span className="text-sm font-semibold text-slate-700">
                  {Number(course.rating_avg).toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">({course.rating_count})</span>
              </>
            ) : (
              <span className="text-xs text-slate-400">{t("noRating")}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="size-3.5" />
            <span>{t("totalDuration", { hours, minutes })}</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t("priceLabel")}
          </span>
          <span className="text-lg font-extrabold text-[var(--ev-blue)]">
            {course.price_xof.toLocaleString("fr-CI")}
            <span className="ml-0.5 text-sm font-bold text-slate-500">FCFA</span>
          </span>
        </div>
        <Link href={`/courses/${course.id}`} className="block">
          <Button
            size="sm"
            className="rounded-xl bg-[var(--ev-blue)] px-5 text-sm font-bold text-white shadow-md shadow-[var(--ev-blue)]/20 transition-all hover:bg-[var(--ev-blue-light)] hover:shadow-lg hover:shadow-[var(--ev-blue)]/30"
          >
            {t("viewCourse")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
