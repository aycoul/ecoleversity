"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Send, RotateCw } from "lucide-react";

export type SummaryReviewItem = {
  recordingId: number;
  classTitle: string;
  subject: string;
  scheduledAt: string;
  initialSummary: string;
  durationSeconds: number | null;
};

export function SummaryReviewCard({ item }: { item: SummaryReviewItem }) {
  const [summary, setSummary] = useState(item.initialSummary);
  const [pending, startSend] = useTransition();
  const [sent, setSent] = useState(false);

  function approve() {
    if (summary.trim().length < 20) {
      toast.error("Le résumé doit contenir au moins 20 caractères");
      return;
    }
    startSend(async () => {
      const res = await fetch("/api/recordings/approve-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId: item.recordingId, summary }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error ?? "Échec de l'envoi");
        return;
      }
      setSent(true);
      toast.success(
        j.emailsSent != null
          ? `Résumé envoyé à ${j.emailsSent} parent${j.emailsSent > 1 ? "s" : ""}`
          : "Résumé envoyé"
      );
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-[var(--ev-green)]/30 bg-[var(--ev-green-50)] p-5">
        <p className="text-sm font-semibold text-[var(--ev-green-dark)]">
          ✓ Envoyé — {item.classTitle}
        </p>
      </div>
    );
  }

  const date = new Date(item.scheduledAt);
  const dateLabel = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Abidjan",
  });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          {item.classTitle}
        </h3>
        <p className="text-xs text-slate-500">
          {item.subject} · {dateLabel}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-700">
          Résumé pour les parents (modifiable avant envoi)
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed focus:border-[var(--ev-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--ev-blue)]"
          disabled={pending}
        />
        <p className="text-xs text-slate-400">
          {summary.length} caractères · La transcription brute reste
          disponible pour l&apos;entra&icirc;nement du jumeau IA.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSummary(item.initialSummary)}
          disabled={pending || summary === item.initialSummary}
        >
          <RotateCw className="mr-2 size-4" />
          Restaurer le résumé IA
        </Button>
        <Button
          onClick={approve}
          disabled={pending || summary.trim().length < 20}
          className="bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          Approuver et envoyer
        </Button>
      </div>
    </div>
  );
}
