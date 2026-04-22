"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plane, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AwayModeToggleProps = {
  initialIsAway: boolean;
  initialAwayUntil?: string | null;
  initialAwayMessage?: string | null;
};

export function AwayModeToggle({
  initialIsAway,
  initialAwayUntil,
  initialAwayMessage,
}: AwayModeToggleProps) {
  const t = useTranslations("away");
  const [isAway, setIsAway] = useState(initialIsAway);
  const [awayUntil, setAwayUntil] = useState(initialAwayUntil ?? "");
  const [awayMessage, setAwayMessage] = useState(initialAwayMessage ?? "");
  const [saving, setSaving] = useState(false);

  const handleToggle = useCallback(async () => {
    setSaving(true);
    const newState = !isAway;

    try {
      const res = await fetch("/api/teacher/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_away: newState,
          away_until: newState ? awayUntil || null : null,
          away_message: newState ? awayMessage || null : null,
        }),
      });

      if (res.ok) {
        setIsAway(newState);
        toast.success(newState ? t("awayEnabled") : t("awayDisabled"));
      }
    } finally {
      setSaving(false);
    }
  }, [isAway, awayUntil, awayMessage, t]);

  return (
    <div className={`rounded-xl border p-5 ${isAway ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className={`size-5 ${isAway ? "text-amber-600" : "text-slate-400"}`} />
          <div>
            <h3 className="font-semibold text-slate-900">{t("title")}</h3>
            <p className="text-xs text-slate-500">{t("description")}</p>
          </div>
        </div>
        <Button
          onClick={handleToggle}
          disabled={saving}
          variant={isAway ? "destructive" : "default"}
          size="sm"
        >
          {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
          {isAway ? t("deactivate") : t("activate")}
        </Button>
      </div>

      {isAway && (
        <div className="mt-4 space-y-3">
          <div>
            <Label>{t("untilLabel")}</Label>
            <Input
              type="date"
              value={awayUntil}
              onChange={(e) => setAwayUntil(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("messageLabel")}</Label>
            <Textarea
              value={awayMessage}
              onChange={(e) => setAwayMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
