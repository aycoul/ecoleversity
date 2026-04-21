"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Copy, Check, Gift, Users, Loader2 } from "lucide-react";

export function ReferralCard() {
  const t = useTranslations("referral");
  const [code, setCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/referrals");
        const json = await res.json();
        if (json.data) {
          setCode(json.data.code);
          setReferralCount(json.data.referralCount);
          setTotalEarned(json.data.totalEarned);
          setCreditAmount(json.data.creditAmount);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCopy = useCallback(async () => {
    const shareUrl = `${window.location.origin}/r/${code}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleShareWhatsApp = useCallback(() => {
    const shareUrl = `${window.location.origin}/r/${code}`;
    const text = t("shareMessage", { url: shareUrl, amount: creditAmount.toLocaleString("fr-CI") });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [code, creditAmount, t]);

  if (loading) {
    return <Loader2 className="mx-auto size-6 animate-spin text-[var(--ev-blue)]" />;
  }

  return (
    <div className="rounded-2xl border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] p-6">
      <div className="mb-4 flex items-center gap-3">
        <Gift className="size-6 text-[var(--ev-green)]" />
        <h3 className="text-lg font-bold text-slate-900">{t("title")}</h3>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        {t("description", { amount: creditAmount.toLocaleString("fr-CI") })}
      </p>

      {/* Referral code */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-white px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-[var(--ev-blue)]">
          {code}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
          aria-label="Copier le code de parrainage"
          title="Copier le code"
        >
          {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
        </Button>
      </div>

      {/* Actions */}
      <div className="mb-4 flex gap-2">
        <Button
          onClick={handleCopy}
          variant="outline"
          className="flex-1 text-sm"
        >
          <Copy className="mr-2 size-4" />
          {t("copyLink")}
        </Button>
        <Button
          onClick={handleShareWhatsApp}
          className="flex-1 bg-green-600 text-sm text-white hover:bg-green-700"
        >
          {t("shareWhatsApp")}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between rounded-lg bg-white/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="size-4" />
          <span>{t("referrals", { count: referralCount })}</span>
        </div>
        <span className="text-sm font-bold text-[var(--ev-green-dark)]">
          +{totalEarned.toLocaleString("fr-CI")} FCFA
        </span>
      </div>
    </div>
  );
}
