"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { GRADE_LEVEL_LABELS } from "@/types/domain";
import type { GradeLevel } from "@/types/domain";
import { Loader2, Clock } from "lucide-react";

type WaitlistButtonProps = {
  classId: string;
  learners: Array<{ id: string; first_name: string; grade_level: string }>;
};

export function WaitlistButton({ classId, learners }: WaitlistButtonProps) {
  const t = useTranslations("groupClass");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [selectedLearner, setSelectedLearner] = useState(
    learners[0]?.id ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);

  // Poll for position updates
  const checkPosition = useCallback(async () => {
    if (!joined || !selectedLearner) return;

    try {
      const res = await fetch(
        `/api/classes/waitlist?classId=${classId}&learnerId=${selectedLearner}`
      );
      const data = await res.json();

      if (data.onWaitlist) {
        setPosition(data.position);
        if (data.spotAvailable) {
          // A spot opened — refresh the page to show enrollment form
          router.refresh();
        }
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [classId, selectedLearner, joined, router]);

  useEffect(() => {
    if (!joined) return;

    const interval = setInterval(checkPosition, 30000);
    return () => clearInterval(interval);
  }, [joined, checkPosition]);

  if (learners.length === 0) {
    return (
      <p className="text-sm text-amber-600">
        Veuillez ajouter un enfant dans votre profil.
      </p>
    );
  }

  if (joined && position !== null) {
    return (
      <div className="space-y-2 rounded-lg bg-amber-50 px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-700">
          <Clock className="size-4" />
          <span className="font-medium">{t("waitlistJoined")}</span>
        </div>
        <p className="text-sm text-amber-600">
          {t("waitlistPosition", { position })}
        </p>
      </div>
    );
  }

  async function handleJoin() {
    if (!selectedLearner) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/classes/waitlist", {
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

      setPosition(data.position);
      setJoined(true);
      setIsSubmitting(false);
    } catch {
      setError(tCommon("error"));
      setIsSubmitting(false);
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-amber-700">{t("classFull")}</p>

      <label className="text-sm font-medium text-slate-700">
        {t("selectChild")}
      </label>
      <select
        value={selectedLearner}
        onChange={(e) => setSelectedLearner(e.target.value)}
        className={selectClass}
      >
        {learners.map((l) => (
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
        onClick={handleJoin}
        disabled={isSubmitting || !selectedLearner}
        className="w-full bg-amber-500 hover:bg-amber-600"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : null}
        {t("joinWaitlist")}
      </Button>
    </div>
  );
}
