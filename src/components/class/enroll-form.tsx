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
};

export function EnrollForm({
  classId,
  learners,
  alreadyEnrolledIds,
}: EnrollFormProps) {
  const t = useTranslations("groupClass");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const availableLearners = learners.filter(
    (l) => !alreadyEnrolledIds.includes(l.id)
  );

  const [selectedLearner, setSelectedLearner] = useState(
    availableLearners[0]?.id ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (learners.length === 0) {
    return (
      <p className="text-sm text-amber-600">
        Veuillez ajouter un enfant dans votre profil.
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

  async function handleEnroll() {
    if (!selectedLearner) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/classes/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, learnerId: selectedLearner }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setIsSubmitting(false);
        return;
      }

      if (data.waitlisted) {
        // Shouldn't happen here since we check isFull in parent, but handle gracefully
        router.refresh();
        return;
      }

      // Redirect to payment
      router.push(`/payment/${data.transactionId}`);
    } catch {
      setError(tCommon("error"));
      setIsSubmitting(false);
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">
        {t("selectChild")}
      </label>
      <select
        value={selectedLearner}
        onChange={(e) => setSelectedLearner(e.target.value)}
        className={selectClass}
      >
        {availableLearners.map((l) => (
          <option key={l.id} value={l.id}>
            {l.first_name} (
            {GRADE_LEVEL_LABELS[l.grade_level as GradeLevel] ?? l.grade_level})
          </option>
        ))}
      </select>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        onClick={handleEnroll}
        disabled={isSubmitting || !selectedLearner}
        className="w-full bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : null}
        {t("confirmEnroll")}
      </Button>
    </div>
  );
}
