"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Calendar, Clock, Users, Sparkles } from "lucide-react";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { SaveClassButton } from "./save-class-button";

export type ClassCardData = {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  scheduled_at: string;
  duration_minutes: number;
  max_students: number;
  price_xof: number;
  enrolled_count: number;
  teacher_name: string;
  teacher_avatar: string | null;
  is_trial?: boolean;
  is_saved?: boolean;
};

export function ClassCard({ cls }: { cls: ClassCardData }) {
  const t = useTranslations("groupClass");

  // Pin to Abidjan (GMT+0) so all parents + teachers see the same clock time,
  // regardless of browser TZ (diaspora users in Paris/NYC would otherwise
  // see times shifted by hours from the actual class schedule).
  const date = new Date(cls.scheduled_at);
  const dateStr = date.toLocaleDateString("fr-CI", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Abidjan",
  });
  const timeStr = date.toLocaleTimeString("fr-CI", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });

  const spotsRemaining = cls.max_students - cls.enrolled_count;
  const isFull = spotsRemaining <= 0;
  const fillPercent = Math.min(
    100,
    Math.round((cls.enrolled_count / cls.max_students) * 100)
  );

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-1 p-4 space-y-3">
        {/* Title + Save */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-800 line-clamp-2">
            {cls.title}
          </h3>
          <SaveClassButton classId={cls.id} initialSaved={cls.is_saved} size="sm" />
        </div>

        {/* Teacher */}
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
            {cls.teacher_avatar ? (
              <img
                src={cls.teacher_avatar}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              cls.teacher_name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-sm text-slate-600">{cls.teacher_name}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {cls.is_trial && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--ev-amber)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ev-amber)]">
              <Sparkles className="size-3" />
              {t("freeTrial")}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-[var(--ev-green-50)] px-2 py-0.5 text-xs font-medium text-[var(--ev-blue)]">
            {SUBJECT_LABELS[cls.subject as Subject] ?? cls.subject}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {GRADE_LEVEL_LABELS[cls.grade_level as GradeLevel] ?? cls.grade_level}
          </span>
        </div>

        {/* Date + Duration */}
        <div className="space-y-1 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {dateStr} - {timeStr}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {cls.duration_minutes} min
          </div>
        </div>

        {/* Price */}
        <div className="text-base font-bold text-slate-800">
          {cls.is_trial ? (
            <span className="text-[var(--ev-green)]">{t("free")}</span>
          ) : (
            <>
              {cls.price_xof.toLocaleString("fr-CI")} FCFA
              <span className="text-sm font-normal text-slate-400">
                {" "}
                {t("perStudent")}
              </span>
            </>
          )}
        </div>

        {/* Spots */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              <span className={isFull ? "text-red-600 font-medium" : "text-slate-600"}>
                {isFull
                  ? t("spotsFull")
                  : t("spots", {
                      available: cls.enrolled_count,
                      total: cls.max_students,
                    })}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? "bg-red-400" : "bg-[var(--ev-green)]"
              }`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="border-t border-slate-100 p-3">
        <Link href={`/classes/${cls.id}`} className="block">
          <Button
            className={`w-full ${
              isFull
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
            }`}
          >
            {isFull ? t("joinWaitlist") : cls.is_trial ? t("bookTrial") : t("enroll")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
