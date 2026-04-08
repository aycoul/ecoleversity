"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { GRADE_LEVEL_LABELS } from "@/types/domain";
import type { GradeLevel } from "@/types/domain";
import { Loader2, User, CheckCircle } from "lucide-react";
import { Link } from "@/i18n/routing";

type Learner = {
  id: string;
  first_name: string;
  grade_level: GradeLevel;
};

type EnrollButtonProps = {
  courseId: string;
  priceXof: number;
  isLoggedIn: boolean;
  isParent: boolean;
  learners: Learner[];
  enrolledLearnerIds: string[];
};

export function EnrollButton({
  courseId,
  priceXof,
  isLoggedIn,
  isParent,
  learners,
  enrolledLearnerIds,
}: EnrollButtonProps) {
  const t = useTranslations("courseCatalog");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [selectedLearner, setSelectedLearner] = useState(
    learners[0]?.id ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  // Check if the selected learner is already enrolled
  const isSelectedEnrolled = enrolledLearnerIds.includes(selectedLearner);
  // Check if all learners are enrolled
  const allEnrolled =
    learners.length > 0 &&
    learners.every((l) => enrolledLearnerIds.includes(l.id));

  if (!isLoggedIn) {
    return (
      <Link href="/register" className="block">
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
          {t("enrollNow", { price: priceXof.toLocaleString("fr-CI") })}
        </Button>
      </Link>
    );
  }

  if (!isParent) {
    return null;
  }

  if (allEnrolled) {
    return (
      <Link href={`/courses/${courseId}`} className="block">
        <Button
          variant="outline"
          className="w-full border-emerald-200 text-emerald-700"
        >
          <CheckCircle className="mr-2 size-4" />
          {t("alreadyEnrolled")}
        </Button>
      </Link>
    );
  }

  if (learners.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-amber-600">{t("addChildFirst")}</p>
        <Link href="/onboarding/parent">
          <Button variant="outline" className="w-full">
            {t("selectChild")}
          </Button>
        </Link>
      </div>
    );
  }

  async function handleEnroll() {
    if (!selectedLearner) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          learnerId: selectedLearner,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setIsSubmitting(false);
        return;
      }

      // Redirect to payment page
      router.push(`/payment/${data.transactionId}`);
    } catch {
      setError(tCommon("error"));
      setIsSubmitting(false);
    }
  }

  if (!showSelector) {
    return (
      <Button
        onClick={() => setShowSelector(true)}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {t("enrollNow", { price: priceXof.toLocaleString("fr-CI") })}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Child selector */}
      <div className="space-y-2">
        <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
          <User className="size-4" />
          {t("selectChild")}
        </label>
        <select
          value={selectedLearner}
          onChange={(e) => setSelectedLearner(e.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {learners.map((l) => (
            <option
              key={l.id}
              value={l.id}
              disabled={enrolledLearnerIds.includes(l.id)}
            >
              {l.first_name} ({GRADE_LEVEL_LABELS[l.grade_level]})
              {enrolledLearnerIds.includes(l.id)
                ? ` - ${t("alreadyEnrolled")}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        onClick={handleEnroll}
        disabled={isSubmitting || isSelectedEnrolled}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : null}
        {isSelectedEnrolled
          ? t("alreadyEnrolled")
          : t("enrollNow", { price: priceXof.toLocaleString("fr-CI") })}
      </Button>
    </div>
  );
}
