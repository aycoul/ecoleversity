"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type ReportButtonProps = {
  targetType: "teacher" | "class" | "course" | "review" | "message";
  targetId: string;
};

const CATEGORIES = ["inappropriate", "safety", "spam", "off_platform", "other"] as const;

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const CATEGORY_LABELS: Record<string, string> = {
    inappropriate: t("inappropriate"),
    safety: t("safety"),
    spam: t("spam"),
    off_platform: t("offPlatform"),
    other: t("other"),
  };

  const handleSubmit = useCallback(async () => {
    if (!category) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, category, description }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success(t("submitted"));
      } else {
        const json = await res.json();
        toast.error(json.error);
      }
    } finally {
      setSubmitting(false);
    }
  }, [targetType, targetId, category, description, t]);

  if (submitted) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="size-3" />
        {t("submitted")}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
      >
        <Flag className="size-3" />
        {t("report")}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-slate-700">{t("selectCategory")}</p>
          <div className="mb-2 space-y-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                  category === cat
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={2}
            className="mb-2 text-xs"
          />
          <Button
            onClick={handleSubmit}
            disabled={!category || submitting}
            size="sm"
            variant="destructive"
            className="w-full text-xs"
          >
            {submitting && <Loader2 className="mr-1 size-3 animate-spin" />}
            {t("send")}
          </Button>
        </div>
      )}
    </div>
  );
}
