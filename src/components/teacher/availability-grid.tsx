"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Slot = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AvailabilityGridProps = {
  teacherId: string;
  initialSlots: Slot[];
};

const TIME_SLOTS: string[] = [];
for (let h = 7; h < 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

// Monday first (1-6, then 0 for Sunday)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function slotKey(day: number, time: string): string {
  return `${day}-${time}`;
}

function endTimeFor(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + 30;
  const eh = Math.floor(totalMin / 60);
  const em = totalMin % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export function AvailabilityGrid({
  teacherId,
  initialSlots,
}: AvailabilityGridProps) {
  const t = useTranslations("teacher");
  const tDays = useTranslations("days");
  const [isPending, startTransition] = useTransition();

  // Build initial selected set from DB slots
  const initialSelected = new Set<string>();
  for (const slot of initialSlots) {
    // Each DB slot is a 30-min block
    const startMin =
      parseInt(slot.start_time.split(":")[0]) * 60 +
      parseInt(slot.start_time.split(":")[1]);
    const endMin =
      parseInt(slot.end_time.split(":")[0]) * 60 +
      parseInt(slot.end_time.split(":")[1]);

    for (let m = startMin; m < endMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const timeStr = `${hh}:${mm}`;
      if (TIME_SLOTS.includes(timeStr)) {
        initialSelected.add(slotKey(slot.day_of_week, timeStr));
      }
    }
  }

  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  // Mobile: show one day at a time
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  function toggleSlot(day: number, time: string) {
    const key = slotKey(day, time);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handlePointerDown(day: number, time: string) {
    const key = slotKey(day, time);
    const willAdd = !selected.has(key);
    setDragMode(willAdd ? "add" : "remove");
    setIsDragging(true);
    toggleSlot(day, time);
  }

  function handlePointerEnter(day: number, time: string) {
    if (!isDragging) return;
    const key = slotKey(day, time);
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode === "add") {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  async function handleSave() {
    startTransition(async () => {
      const supabase = createClient();

      // Build slot records from selected cells
      const slots: Array<{
        teacher_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_active: boolean;
      }> = [];

      for (const key of selected) {
        const [dayStr, time] = key.split("-");
        const day = parseInt(dayStr);
        slots.push({
          teacher_id: teacherId,
          day_of_week: day,
          start_time: time + ":00",
          end_time: endTimeFor(time) + ":00",
          is_active: true,
        });
      }

      // Delete existing, then insert new
      const { error: deleteError } = await supabase
        .from("teacher_availability")
        .delete()
        .eq("teacher_id", teacherId);

      if (deleteError) {
        toast.error(t("availabilitySaveError"));
        return;
      }

      if (slots.length > 0) {
        const { error: insertError } = await supabase
          .from("teacher_availability")
          .insert(slots);

        if (insertError) {
          toast.error(t("availabilitySaveError"));
          return;
        }
      }

      toast.success(t("availabilitySaved"));
    });
  }

  const hasChanges =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...initialSelected].sort());

  return (
    <div
      className="space-y-4"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Mobile day selector */}
      <div className="flex gap-1 overflow-x-auto pb-2 md:hidden">
        {DAY_ORDER.map((day, idx) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDayIndex(idx)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeDayIndex === idx
                ? "bg-[var(--ev-blue)] text-white"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {tDays(String(day))}
          </button>
        ))}
      </div>

      {/* Mobile single-day view */}
      <div className="md:hidden">
        <div className="space-y-1">
          {TIME_SLOTS.map((time) => {
            const day = DAY_ORDER[activeDayIndex];
            const key = slotKey(day, time);
            const isSelected = selected.has(key);
            return (
              <button
                key={time}
                type="button"
                onClick={() => toggleSlot(day, time)}
                className={cn(
                  "flex w-full items-center rounded-lg border px-4 py-3 text-sm transition-colors",
                  isSelected
                    ? "border-[var(--ev-green)]/30 bg-[var(--ev-green-50)] text-[var(--ev-blue)] font-medium"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                <span className="tabular-nums">
                  {time} - {endTimeFor(time)}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[var(--ev-blue)]">&#10003;</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse select-none">
          <thead>
            <tr>
              <th className="w-16 p-1 text-right text-xs font-medium text-slate-400" />
              {DAY_ORDER.map((day) => (
                <th
                  key={day}
                  className="p-1 text-center text-xs font-medium text-slate-600"
                >
                  {tDays(String(day))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="p-1 text-right text-[0.65rem] tabular-nums text-slate-400">
                  {time}
                </td>
                {DAY_ORDER.map((day) => {
                  const key = slotKey(day, time);
                  const isSelected = selected.has(key);
                  return (
                    <td key={day} className="p-0.5">
                      <div
                        role="button"
                        tabIndex={0}
                        onPointerDown={() => handlePointerDown(day, time)}
                        onPointerEnter={() => handlePointerEnter(day, time)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            toggleSlot(day, time);
                          }
                        }}
                        className={cn(
                          "h-6 w-full cursor-pointer rounded-sm border transition-colors",
                          isSelected
                            ? "border-[var(--ev-green)] bg-[var(--ev-green)]"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          {selected.size}{" "}
          {selected.size === 1 ? "cr\u00e9neau" : "cr\u00e9neaux"}
        </p>
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
        >
          {isPending ? t("savingAvailability") : t("saveAvailability")}
        </Button>
      </div>
    </div>
  );
}
