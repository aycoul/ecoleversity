"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function getIsInstalled() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function getDismissed() {
  if (typeof window === "undefined") return false;
  const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
  if (!dismissedAt) return false;
  const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
  return daysSince < 7;
}

export function PwaInstallPrompt() {
  const t = useTranslations("common");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(getDismissed);
  const [isInstalled, setIsInstalled] = useState(getIsInstalled);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-8 md:left-auto md:right-8 md:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--ev-blue)]/20 bg-white p-4 shadow-lg shadow-[var(--ev-blue)]/10">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-blue-50)] text-[var(--ev-blue)]">
          <Download className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {t("pwaPromptTitle") ?? "Installer écoleVersity"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("pwaPromptSubtitle") ??
              "Accédez plus rapidement et utilisez hors ligne."}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
            >
              {t("pwaPromptInstall") ?? "Installer"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-700"
            >
              {t("pwaPromptLater") ?? "Plus tard"}
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
