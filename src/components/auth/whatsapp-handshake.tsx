"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type HandshakeProps = {
  /** The phone the user just entered, in E.164 (+225...). Prefilled in the greeting. */
  userPhone: string;
  /** Fires when user confirms they sent the WhatsApp message. Parent should trigger the real OTP send. */
  onDone: () => Promise<void> | void;
  /** Fires when user wants to go back and change their number. */
  onBack: () => void;
  /** Optional: let the user skip the handshake if they know they're already in the 24h window. */
  onSkip?: () => Promise<void> | void;
  /** True while the parent is sending the OTP. */
  sending?: boolean;
};

function formatWaMeUrl(userPhone: string): string {
  // NEXT_PUBLIC_AILEAD_WHATSAPP_NUMBER is the destination (EcoleVersity's
  // shared WABA). wa.me expects the number WITHOUT a leading +.
  const dest = (process.env.NEXT_PUBLIC_AILEAD_WHATSAPP_NUMBER ?? "").replace(
    /[^\d]/g,
    ""
  );
  const greeting = encodeURIComponent(
    `Bonjour EcoleVersity, j'ouvre la fenêtre de messagerie pour recevoir mon code (${userPhone}).`
  );
  if (!dest) {
    // Fallback — wa.me without destination is still a valid link, opens a picker
    return `https://wa.me/?text=${greeting}`;
  }
  return `https://wa.me/${dest}?text=${greeting}`;
}

export function WhatsAppHandshake({
  userPhone,
  onDone,
  onBack,
  onSkip,
  sending = false,
}: HandshakeProps) {
  const t = useTranslations("auth");
  const [opened, setOpened] = useState(false);

  const waMeUrl = formatWaMeUrl(userPhone);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-[var(--ev-green-50)]">
          <MessageCircle className="size-7 text-[var(--ev-green)]" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          {t("handshakeTitle")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t("handshakeSubtitle")}</p>
      </div>

      <a
        href={waMeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        className="block"
      >
        <Button
          type="button"
          className="w-full gap-2 bg-[var(--ev-green)] text-base font-bold text-white hover:bg-[var(--ev-green-dark)]"
        >
          <MessageCircle className="size-4" />
          {t("handshakeOpenWhatsApp")}
        </Button>
      </a>

      {opened && (
        <p className="text-center text-xs text-slate-500">
          {t("handshakeTapSend")}
        </p>
      )}

      <Button
        type="button"
        onClick={() => onDone()}
        disabled={sending}
        className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
      >
        {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {t("handshakeDone")}
      </Button>

      {onSkip && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSkip()}
          disabled={sending}
          className="w-full text-sm text-slate-500 hover:text-slate-700"
        >
          {t("handshakeSkip")}
        </Button>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={sending}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
      >
        <ArrowLeft className="size-3.5" />
        {t("handshakeBack")}
      </button>
    </div>
  );
}
