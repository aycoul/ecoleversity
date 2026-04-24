"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { GRADE_LEVEL_LABELS } from "@/types/domain";
import type { GradeLevel } from "@/types/domain";
import { Loader2, CheckCircle } from "lucide-react";

type EnrollFormProps = {
  classId: string;
  learners: Array<{ id: string; first_name: string; grade_level: string }>;
  alreadyEnrolledIds: string[];
  isTrial?: boolean;
  trialEligibilityLoading?: boolean;
  trialEligible?: boolean;
};

export function EnrollForm({
  classId,
  learners,
  alreadyEnrolledIds,
  isTrial,
  trialEligibilityLoading,
  trialEligible,
}: EnrollFormProps) {
  const t = useTranslations("groupClass");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const availableLearners = learners.filter(
    (l) => !alreadyEnrolledIds.includes(l.id)
  );

  // Multi-select: parents with several kids can enroll more than one at a time.
  // Default to the first available kid selected. Trial classes are per-teacher,
  // so only ONE learner is allowed in that mode — checkbox UI still works, but
  // we disable the extras.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(availableLearners[0]?.id ? [availableLearners[0].id] : [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (learners.length === 0) {
    return (
      <p className="text-sm text-amber-600">
        {t("enrollMustAddChild")}
      </p>
    );
  }

  if (availableLearners.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[var(--ev-green-50)] px-4 py-3 text-sm text-[var(--ev-blue)]">
        <CheckCircle className="size-4" />
        {t("alreadyEnrolled")}
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Trial: enforce single-learner selection.
      if (isTrial && next.size > 1) {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  async function handleEnroll() {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setError(null);

    // Enroll each selected learner in sequence. For trial classes there
    // will only be one. For paid classes with multiple kids, each POST
    // creates a distinct pending transaction — we redirect to the first
    // one so the parent can start paying; the rest wait on the payments
    // page.
    const ids = Array.from(selected);
    const results: Array<{ learnerId: string; isTrial?: boolean; transactionId?: string; waitlisted?: boolean; error?: string }> = [];

    for (const learnerId of ids) {
      try {
        const res = await fetch("/api/classes/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, learnerId }),
        });
        const data = await res.json();
        if (!res.ok) {
          results.push({ learnerId, error: data.error ?? tCommon("error") });
        } else {
          results.push({
            learnerId,
            isTrial: data.isTrial,
            transactionId: data.transactionId,
            waitlisted: data.waitlisted,
          });
        }
      } catch {
        results.push({ learnerId, error: tCommon("error") });
      }
    }

    const firstError = results.find((r) => r.error);
    if (firstError && results.every((r) => r.error)) {
      // All failed — surface the first error, stay on the page.
      setError(firstError.error!);
      setIsSubmitting(false);
      return;
    }

    // At least one succeeded. Prefer navigating to the first outstanding
    // payment; else the sessions page.
    const firstPayable = results.find((r) => r.transactionId);
    if (firstPayable) {
      router.push(`/payment/${firstPayable.transactionId}`);
      return;
    }
    // All trials / waitlisted / free — go to sessions.
    router.push("/dashboard/parent/sessions");
  }

  const confirmedAvailable = Array.from(selected).filter((id) =>
    availableLearners.some((l) => l.id === id)
  ).length;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">
        {availableLearners.length === 1 ? t("selectChild") : t("selectChildren")}
      </label>

      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
        {availableLearners.map((l) => {
          const checked = selected.has(l.id);
          const label = `${l.first_name} (${GRADE_LEVEL_LABELS[l.grade_level as GradeLevel] ?? l.grade_level})`;
          return (
            <label
              key={l.id}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                checked
                  ? "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(l.id)}
                className="size-4 accent-[var(--ev-blue)]"
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>

      {isTrial && selected.size > 1 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {t("trialOneChildOnly")}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isTrial && !trialEligible && !trialEligibilityLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("trialAlreadyUsed")}
        </div>
      )}

      <Button
        onClick={handleEnroll}
        disabled={
          isSubmitting ||
          confirmedAvailable === 0 ||
          (isTrial && trialEligible === false)
        }
        className={`w-full ${isTrial ? "bg-[var(--ev-green)] hover:bg-[var(--ev-green)]/90" : "bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"}`}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : null}
        {isTrial
          ? t("bookTrial")
          : confirmedAvailable > 1
          ? t("confirmEnrollMany", { count: confirmedAvailable })
          : t("confirmEnroll")}
      </Button>
    </div>
  );
}
