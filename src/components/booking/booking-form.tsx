"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import {
  CalendarDays,
  Clock,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import { calculateSessionPrice } from "@/lib/booking";

type AvailabilitySlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type ExistingBooking = {
  scheduled_at: string;
  duration_minutes: number;
};

type Learner = {
  id: string;
  first_name: string;
  grade_level: GradeLevel;
};

type TeacherInfo = {
  id: string;
  display_name: string;
  subjects: Subject[];
};

type BookingFormProps = {
  teacher: TeacherInfo;
  availability: AvailabilitySlot[];
  existingBookings: ExistingBooking[];
  learners: Learner[];
};

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function formatDateShort(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "fr" ? "fr-CI" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateFull(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "fr" ? "fr-CI" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Generate 30-min slot windows within a start-end time range */
function generateSlots(
  startTime: string,
  endTime: string
): Array<{ start: string; end: string }> {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const slots: Array<{ start: string; end: string }> = [];
  for (let t = startMin; t + 30 <= endMin; t += 30) {
    slots.push({ start: minutesToTime(t), end: minutesToTime(t + 30) });
  }
  return slots;
}

export function BookingForm({
  teacher,
  availability,
  existingBookings,
  learners,
}: BookingFormProps) {
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    teacher.subjects[0] ?? ""
  );
  const [selectedLearner, setSelectedLearner] = useState(
    learners[0]?.id ?? ""
  );
  const [durationMinutes, setDurationMinutes] = useState<30 | 60>(30);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next7Days = useMemo(() => getNext7Days(), []);

  // Get available slots for the selected date
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeek = selectedDate.getDay(); // 0=Sunday
    const daySlots = availability.filter(
      (a) => a.day_of_week === dayOfWeek
    );

    // Generate 30-min windows from each availability range
    const allSlots = daySlots.flatMap((a) =>
      generateSlots(a.start_time, a.end_time)
    );

    // Filter out slots that conflict with existing bookings
    return allSlots.filter((slot) => {
      const slotStart = new Date(selectedDate);
      const [sh, sm] = slot.start.split(":").map(Number);
      slotStart.setHours(sh, sm, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

      return !existingBookings.some((b) => {
        const bStart = new Date(b.scheduled_at).getTime();
        const bEnd = bStart + b.duration_minutes * 60 * 1000;
        return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
      });
    });
  }, [selectedDate, availability, existingBookings, durationMinutes]);

  const selectedLearnerObj = learners.find((l) => l.id === selectedLearner);
  const price = calculateSessionPrice(durationMinutes);

  function buildScheduledAt(): string {
    if (!selectedDate || !selectedSlot) return "";
    // Build ISO string directly to avoid browser timezone issues
    // Slot times are Africa/Abidjan (GMT+0 = UTC), so construct UTC directly
    const dateStr = selectedDate.toISOString().split("T")[0];
    return `${dateStr}T${selectedSlot.start}:00.000Z`;
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          learnerId: selectedLearner,
          subject: selectedSubject,
          gradeLevel: selectedLearnerObj?.grade_level ?? "6eme",
          scheduledAt: buildScheduledAt(),
          durationMinutes,
          note: note || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setIsSubmitting(false);
        return;
      }

      // Redirect to payment instructions page
      router.push(`/payment/${data.transactionId}`);
    } catch {
      setError(tCommon("error"));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-[var(--ev-green)]" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Date + Time */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarDays className="size-5 text-[var(--ev-blue)]" />
            {t("selectDate")}
          </h2>

          {/* Date buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {next7Days.map((day) => {
              const isSelected =
                selectedDate?.toDateString() === day.toDateString();
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setSelectedSlot(null);
                  }}
                  className={`flex min-w-[5rem] flex-col items-center rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-[var(--ev-green)] bg-[var(--ev-green-50)] text-[var(--ev-blue)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs uppercase">
                    {day.toLocaleDateString("fr-CI", { weekday: "short" })}
                  </span>
                  <span className="text-base font-bold">{day.getDate()}</span>
                  <span className="text-xs">
                    {day.toLocaleDateString("fr-CI", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="size-4 text-[var(--ev-blue)]" />
                {t("selectTime")}
              </h3>

              {slotsForDate.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                  {t("noSlots")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slotsForDate.map((slot) => {
                    const isSelected =
                      selectedSlot?.start === slot.start &&
                      selectedSlot?.end === slot.end;
                    return (
                      <button
                        key={`${slot.start}-${slot.end}`}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                          isSelected
                            ? "border-[var(--ev-green)] bg-[var(--ev-green-50)] text-[var(--ev-blue)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {slot.start} - {slot.end}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              disabled={!selectedDate || !selectedSlot}
              onClick={() => setStep(2)}
              className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
            >
              {tCommon("next")}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Session details */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <BookOpen className="size-5 text-[var(--ev-blue)]" />
            {t("sessionDetails")}
          </h2>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">{t("subject")}</Label>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {teacher.subjects.map((s) => (
                <option key={s} value={s}>
                  {SUBJECT_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          {/* Child */}
          <div className="space-y-2">
            <Label htmlFor="learner">
              <User className="mr-1 inline size-4" />
              {t("child")}
            </Label>
            {learners.length === 0 ? (
              <p className="text-sm text-amber-600">
                Veuillez ajouter un enfant dans votre profil.
              </p>
            ) : (
              <select
                id="learner"
                value={selectedLearner}
                onChange={(e) => setSelectedLearner(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} ({GRADE_LEVEL_LABELS[l.grade_level]})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>{t("duration")}</Label>
            <div className="flex gap-3">
              {([30, 60] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationMinutes(d)}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                    durationMinutes === d
                      ? "border-[var(--ev-green)] bg-[var(--ev-green-50)] text-[var(--ev-blue)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div>{d === 30 ? t("minutes30") : t("minutes60")}</div>
                  <div className="mt-1 text-base font-bold">
                    {calculateSessionPrice(d).toLocaleString("fr-CI")} FCFA
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">{t("note")}</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder=""
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="mr-1 size-4" />
              {tCommon("previous")}
            </Button>
            <Button
              disabled={!selectedSubject || !selectedLearner}
              onClick={() => setStep(3)}
              className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
            >
              {tCommon("next")}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Check className="size-5 text-[var(--ev-blue)]" />
            {t("summary")}
          </h2>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <SummaryRow label={t("teacher")} value={teacher.display_name} />
            <SummaryRow
              label={t("date")}
              value={selectedDate ? formatDateFull(selectedDate, "fr") : ""}
            />
            <SummaryRow
              label={t("time")}
              value={
                selectedSlot
                  ? `${selectedSlot.start} - ${minutesToTime(
                      timeToMinutes(selectedSlot.start) + durationMinutes
                    )}`
                  : ""
              }
            />
            <SummaryRow
              label={t("subject")}
              value={
                SUBJECT_LABELS[selectedSubject as Subject] ?? selectedSubject
              }
            />
            <SummaryRow
              label={t("child")}
              value={
                selectedLearnerObj
                  ? `${selectedLearnerObj.first_name} (${GRADE_LEVEL_LABELS[selectedLearnerObj.grade_level]})`
                  : ""
              }
            />
            <SummaryRow
              label={t("duration")}
              value={
                durationMinutes === 30 ? t("minutes30") : t("minutes60")
              }
            />
            <div className="border-t border-slate-200 pt-3">
              <SummaryRow
                label={t("price")}
                value={`${price.toLocaleString("fr-CI")} FCFA`}
                bold
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-1 size-4" />
              {tCommon("previous")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {t("confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={
          bold
            ? "text-base font-bold text-[var(--ev-blue)]"
            : "font-medium text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
