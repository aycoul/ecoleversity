import Link from "next/link";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  Repeat,
  Users,
} from "lucide-react";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import {
  formatClassDateTime,
  type GroupClassCard,
} from "@/lib/marketplace/group-classes-data";

type Props = {
  card: GroupClassCard;
  /** Compact variant used on teacher profile. Hides teacher + avatar. */
  compact?: boolean;
};

const RECURRENCE_LABEL: Record<string, string> = {
  one_time: "Cours unique",
  weekly: "Chaque semaine",
  custom: "Récurrent",
};

export function GroupClassListCard({ card, compact = false }: Props) {
  const fullFull = card.spotsLeft === 0;
  const href = `/classes/${card.id}`;

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
            {card.title}
          </h3>
          {!compact && (
            <p className="mt-0.5 text-xs text-slate-500">
              Avec <span className="font-medium text-slate-700">{card.teacherName}</span>
              {card.teacherCity ? ` · ${card.teacherCity}` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <p className="text-lg font-bold text-[var(--ev-blue)]">
            {card.priceXof.toLocaleString("fr-CI")}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            FCFA / élève
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ev-green-50)] px-2 py-0.5 font-medium text-[var(--ev-green)]">
          {SUBJECT_LABELS[card.subject as Subject] ?? card.subject}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
          <GraduationCap className="size-3" />
          {GRADE_LEVEL_LABELS[card.gradeLevel as GradeLevel] ?? card.gradeLevel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
          <Repeat className="size-3" />
          {RECURRENCE_LABEL[card.recurrence] ?? card.recurrence}
        </span>
      </div>

      {/* Schedule + capacity */}
      <div className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-slate-400" />
          {formatClassDateTime(card.scheduledAt)}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-slate-400" />
          {card.durationMinutes} min
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-slate-400" />
          {fullFull ? (
            <span className="font-medium text-rose-600">Complet</span>
          ) : (
            <span>
              {card.enrolledCount}/{card.maxStudents} inscrits
              {card.spotsLeft <= 3 && (
                <span className="ml-1 font-medium text-amber-600">
                  (plus que {card.spotsLeft})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* CTA (static — the whole card is a link) */}
      <div
        className={`mt-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors ${
          fullFull
            ? "bg-slate-100 text-slate-500"
            : "bg-[var(--ev-blue)] text-white group-hover:bg-[var(--ev-blue-light)]"
        }`}
      >
        {fullFull ? "Complet" : "Voir le cours"}
      </div>
    </Link>
  );
}
