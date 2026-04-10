"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Award, Download, Loader2 } from "lucide-react";

type CertificateButtonProps = {
  enrollmentId: string;
  existingUrl?: string | null;
  progressPct: number;
};

export function CertificateButton({
  enrollmentId,
  existingUrl,
  progressPct,
}: CertificateButtonProps) {
  const t = useTranslations("player");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(existingUrl ?? null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      });
      const json = await res.json();
      if (json.data?.url) {
        setUrl(json.data.url);
        window.open(json.data.url, "_blank");
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  if (progressPct < 100) return null;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-amber-600"
      >
        <Download className="size-5" />
        {t("downloadCertificate")}
      </a>
    );
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      className="bg-amber-500 text-white shadow-lg hover:bg-amber-600"
    >
      {loading ? (
        <Loader2 className="mr-2 size-5 animate-spin" />
      ) : (
        <Award className="mr-2 size-5" />
      )}
      {t("generateCertificate")}
    </Button>
  );
}
