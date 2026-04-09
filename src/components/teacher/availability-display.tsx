import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";

type Slot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AvailabilityDisplayProps = {
  slots: Slot[];
};

// Monday first
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatTime(time: string): string {
  // "09:00:00" or "09:00" -> "09:00"
  return time.slice(0, 5);
}

export function AvailabilityDisplay({ slots }: AvailabilityDisplayProps) {
  const t = useTranslations("teacher");
  const tDays = useTranslations("days");

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">{t("noAvailability")}</p>
    );
  }

  // Group slots by day
  const byDay = new Map<number, Slot[]>();
  for (const slot of slots) {
    const existing = byDay.get(slot.day_of_week) ?? [];
    existing.push(slot);
    byDay.set(slot.day_of_week, existing);
  }

  // Merge consecutive slots for display
  function mergeSlots(daySlots: Slot[]): Array<{ start: string; end: string }> {
    const sorted = [...daySlots].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );
    const merged: Array<{ start: string; end: string }> = [];

    for (const slot of sorted) {
      const last = merged[merged.length - 1];
      if (last && last.end === formatTime(slot.start_time)) {
        last.end = formatTime(slot.end_time);
      } else {
        merged.push({
          start: formatTime(slot.start_time),
          end: formatTime(slot.end_time),
        });
      }
    }
    return merged;
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Clock className="size-4" />
        {t("availableSlots")}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {DAY_ORDER.filter((day) => byDay.has(day)).map((day) => {
          const ranges = mergeSlots(byDay.get(day)!);
          return (
            <div
              key={day}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <p className="text-xs font-medium text-slate-600">
                {tDays(String(day))}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ranges.map((range) => (
                  <span
                    key={`${range.start}-${range.end}`}
                    className="rounded-md bg-[var(--ev-green)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ev-blue)]"
                  >
                    {range.start} - {range.end}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
