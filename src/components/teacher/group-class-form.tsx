"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Loader2, CheckCircle, Users, User } from "lucide-react";

type GroupClassFormProps = {
  subjects: string[];
  gradeLevels: string[];
};

type ClassFormat = "group" | "one_on_one";
type Recurrence = "one_time" | "weekly";

export function GroupClassForm({ subjects, gradeLevels }: GroupClassFormProps) {
  const t = useTranslations("groupClass");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [format, setFormat] = useState<ClassFormat>("group");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [gradeLevel, setGradeLevel] = useState(gradeLevels[0] ?? "");
  const [maxStudents, setMaxStudents] = useState(10);
  const [priceXof, setPriceXof] = useState(3000);
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [recurrence, setRecurrence] = useState<Recurrence>("one_time");
  const [sessionsCount, setSessionsCount] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effectiveMaxStudents = format === "one_on_one" ? 1 : maxStudents;
  const effectiveSessionsCount = recurrence === "weekly" ? sessionsCount : 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/classes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          title,
          description: description || undefined,
          subject,
          gradeLevel,
          maxStudents: effectiveMaxStudents,
          priceXof,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes,
          recurrence,
          sessionsCount: effectiveSessionsCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/teacher/classes");
      }, 1500);
    } catch {
      setError(tCommon("error"));
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="mb-4 size-12 text-[var(--ev-green)]" />
        <p className="text-lg font-semibold text-[var(--ev-blue)]">{t("created")}</p>
        {recurrence === "weekly" && (
          <p className="mt-2 text-sm text-slate-500">
            {t("weeklySessionsDynamic", { count: effectiveSessionsCount })}
          </p>
        )}
      </div>
    );
  }

  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Format picker — group vs 1-to-1 */}
      <div className="space-y-2">
        <Label>{t("format")}</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { value: "group", icon: Users, titleKey: "formatGroup" as const, descKey: "formatGroupDesc" as const },
            { value: "one_on_one", icon: User, titleKey: "formatOneOnOne" as const, descKey: "formatOneOnOneDesc" as const },
          ] as const).map((opt) => {
            const Icon = opt.icon;
            const selected = format === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormat(opt.value)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  selected
                    ? "border-[var(--ev-green)] bg-[var(--ev-green-50)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 ${selected ? "text-[var(--ev-green)]" : "text-slate-500"}`} />
                  <span className={`text-sm font-semibold ${selected ? "text-[var(--ev-blue)]" : "text-slate-700"}`}>
                    {t(opt.titleKey)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{t(opt.descKey)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t("className")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Maths 3eme — Equations du 2nd degre"
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
        />
      </div>

      {/* Subject + Grade row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subject">{t("subject")}</Label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={selectClass}
            required
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABELS[s as Subject] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gradeLevel">{t("gradeLevel")}</Label>
          <select
            id="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={selectClass}
            required
          >
            {gradeLevels.map((g) => (
              <option key={g} value={g}>
                {GRADE_LEVEL_LABELS[g as GradeLevel] ?? g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Max students (group only) + Price row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {format === "group" ? (
          <div className="space-y-2">
            <Label htmlFor="maxStudents">{t("maxStudents")}</Label>
            <Input
              id="maxStudents"
              type="number"
              min={2}
              max={15}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("maxStudents")}</Label>
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
              {t("oneStudentFixed")}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="priceXof">
            {format === "one_on_one" ? t("pricePerSession") : t("pricePerStudent")}
          </Label>
          <Input
            id="priceXof"
            type="number"
            min={500}
            step={500}
            value={priceXof}
            onChange={(e) => setPriceXof(Number(e.target.value))}
            required
          />
        </div>
      </div>

      {/* DateTime */}
      <div className="space-y-2">
        <Label htmlFor="scheduledAt">{t("dateTime")}</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>{t("duration")}</Label>
        <div className="flex gap-3">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDurationMinutes(d)}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-center text-sm font-medium transition-all ${
                durationMinutes === d
                  ? "border-[var(--ev-green)] bg-[var(--ev-green-50)] text-[var(--ev-blue)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {d === 30 ? t("minutes30") : d === 60 ? t("minutes60") : t("minutes90")}
            </button>
          ))}
        </div>
      </div>

      {/* Recurrence */}
      <div className="space-y-2">
        <Label>{t("recurrence")}</Label>
        <div className="flex gap-3">
          {(["one_time", "weekly"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecurrence(r)}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-center text-sm font-medium transition-all ${
                recurrence === r
                  ? "border-[var(--ev-green)] bg-[var(--ev-green-50)] text-[var(--ev-blue)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {r === "one_time" ? t("oneTime") : t("weekly")}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly-only: sessions count */}
      {recurrence === "weekly" && (
        <div className="space-y-2 rounded-lg border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)]/40 p-4">
          <Label htmlFor="sessionsCount">{t("sessionsCount")}</Label>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[4, 8, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionsCount(n)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                    sessionsCount === n
                      ? "border-[var(--ev-green)] bg-white text-[var(--ev-blue)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Input
              id="sessionsCount"
              type="number"
              min={1}
              max={52}
              value={sessionsCount}
              onChange={(e) =>
                setSessionsCount(
                  Math.max(1, Math.min(52, Number(e.target.value) || 1)),
                )
              }
              className="w-20"
            />
            <span className="text-xs text-slate-500">
              {t("sessionsOver", { count: sessionsCount })}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {t("weeklySessionsDynamic", { count: sessionsCount })}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
      >
        {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {t("createClass")}
      </Button>
    </form>
  );
}
