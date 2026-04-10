"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Calendar, Copy, Check, ExternalLink } from "lucide-react";

type CalendarSyncProps = {
  userId: string;
  calendarToken: string;
};

export function CalendarSync({ userId, calendarToken }: CalendarSyncProps) {
  const t = useTranslations("calendar");
  const [copied, setCopied] = useState(false);

  const feedUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar/feed?userId=${userId}&token=${calendarToken}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [feedUrl]);

  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="size-5 text-[var(--ev-blue)]" />
        <h3 className="font-semibold text-slate-900">{t("title")}</h3>
      </div>

      <p className="mb-4 text-sm text-slate-600">{t("description")}</p>

      <div className="space-y-2">
        <a
          href={googleCalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ExternalLink className="size-4" />
          {t("addToGoogle")}
        </a>

        <Button
          onClick={handleCopy}
          variant="outline"
          className="w-full"
        >
          {copied ? <Check className="mr-2 size-4 text-green-600" /> : <Copy className="mr-2 size-4" />}
          {copied ? t("copied") : t("copyLink")}
        </Button>

        <a
          href={feedUrl}
          download="ecoleversity.ics"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Calendar className="size-4" />
          {t("downloadIcs")}
        </a>
      </div>
    </div>
  );
}
