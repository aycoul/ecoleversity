"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type RatingFormProps = {
  liveClassId: string;
  teacherName: string;
};

export function RatingForm({ liveClassId, teacherName }: RatingFormProps) {
  const t = useTranslations("rating");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveClassId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info(t("alreadyRated"));
        } else {
          toast.error(data.error ?? "Erreur");
        }
        return;
      }

      toast.success(t("thankYou"));
      router.push("/dashboard/parent");
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("howWasIt", { teacher: teacherName })}
        </p>
      </div>

      {/* Star rating */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= (hovered || rating);
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label={t("stars", { count: String(star) })}
            >
              <Star
                className={`size-10 transition-colors ${
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none text-slate-300"
                }`}
              />
            </button>
          );
        })}
      </div>

      {rating > 0 && (
        <p className="text-center text-sm font-medium text-amber-600">
          {t("stars", { count: String(rating) })}
        </p>
      )}

      {/* Comment */}
      <div>
        <Textarea
          placeholder={t("comment")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          className="resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        size="lg"
      >
        {submitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 size-4" />
        )}
        {t("submit")}
      </Button>
    </div>
  );
}
