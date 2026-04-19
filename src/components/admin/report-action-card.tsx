"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import type { EnrichedReport } from "@/lib/admin/reports-data";

const CATEGORY_LABEL_FR: Record<string, string> = {
  inappropriate: "Inapproprié",
  safety: "Sécurité",
  spam: "Spam",
  off_platform: "Hors plateforme",
  other: "Autre",
};

const TYPE_LABEL_FR: Record<string, string> = {
  message: "Message",
  review: "Avis",
  teacher: "Enseignant",
  course: "Cours",
  class: "Classe en direct",
};

type Props = {
  report: EnrichedReport;
};

export function ReportActionCard({ report }: Props) {
  const t = useTranslations("adminReports");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState(report.adminNotes ?? "");
  const [resolved, setResolved] = useState<"dismissed" | "action_taken" | null>(
    null
  );

  async function act(action: "dismiss" | "action_taken") {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: report.id,
            action,
            adminNotes: adminNotes.trim() || null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "action_failed");
        }
        setResolved(action === "dismiss" ? "dismissed" : "action_taken");
        toast.success(
          action === "dismiss" ? t("toastDismissed") : t("toastActionTaken")
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  const formattedDate = new Date(report.createdAt).toLocaleDateString("fr-CI", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-xl border bg-white p-5 transition-colors ${
        resolved ? "border-slate-200 opacity-60" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {report.reporterName}
            </span>
            <span className="text-xs text-slate-400">{t("flagged")}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
              {TYPE_LABEL_FR[report.reportedType] ?? report.reportedType}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {CATEGORY_LABEL_FR[report.category] ?? report.category}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{formattedDate}</p>

          {report.description && (
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-medium text-slate-900">
                {t("reason")} :{" "}
              </span>
              {report.description}
            </p>
          )}

          {report.offenderName && (
            <p className="mt-3 text-xs text-slate-500">
              {t("contentBy")}{" "}
              <span className="font-semibold text-slate-700">
                {report.offenderName}
              </span>
            </p>
          )}

          {report.excerpt && (
            <blockquote className="mt-2 rounded-lg border-l-2 border-rose-300 bg-rose-50/50 px-3 py-2 text-sm italic text-slate-800">
              “{report.excerpt}”
            </blockquote>
          )}

          {!report.excerpt && (
            <p className="mt-2 text-xs text-slate-400">
              {t("excerptUnavailable")}
            </p>
          )}
        </div>
      </div>

      {!resolved && report.status === "pending" && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              {t("adminNotesLabel")}
            </span>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder={t("adminNotesPlaceholder")}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-[var(--ev-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--ev-blue)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => act("dismiss")}
              disabled={isPending}
              className="gap-1"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              {t("dismiss")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => act("action_taken")}
              disabled={isPending}
              className="gap-1 bg-rose-600 text-white hover:bg-rose-700"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {t("markActionTaken")}
            </Button>
            {report.offenderId && (
              <a
                href={`/dashboard/admin/strikes?teacher=${report.offenderId}&reportId=${report.id}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <AlertOctagon className="size-3.5" />
                {t("createStrike")}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {(resolved || report.status !== "pending") && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-[var(--ev-green)]">
          <CheckCircle2 className="size-4" />
          {(resolved === "dismissed" || report.status === "dismissed")
            ? t("resolvedDismissed")
            : t("resolvedActionTaken")}
        </div>
      )}
    </div>
  );
}
