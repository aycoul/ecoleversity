"use client";

import { useEffect, useRef, useState } from "react";
import { getJitsiEmbedConfig, getJitsiMeetUrl } from "@/lib/video/jitsi";
import { useTranslations } from "next-intl";

type JitsiEmbedProps = {
  roomId: string;
  userName: string;
  onClose?: () => void;
};

type JitsiApi = {
  dispose: () => void;
  addEventListener: (event: string, handler: () => void) => void;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window {
    JitsiMeetExternalAPI: {
      new (domain: string, options: Record<string, unknown>): JitsiApi;
    };
  }
}

export function JitsiEmbed({ roomId, userName, onClose }: JitsiEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const t = useTranslations("session");

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    let disposed = false;

    const initJitsi = () => {
      if (disposed || !containerRef.current) return;

      const config = getJitsiEmbedConfig(roomId, userName);
      config.parentNode = containerRef.current;

      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        ...config,
        width: "100%",
        height: "100%",
      });

      apiRef.current = api;
      setLoading(false);

      api.addEventListener("readyToClose", () => {
        onClose?.();
      });
    };

    // Load Jitsi external API script dynamically
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = initJitsi;
      script.onerror = () => {
        // Fallback: open in new tab
        window.open(getJitsiMeetUrl(roomId), "_blank");
        onClose?.();
      };
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomId, userName, isMobile, onClose]);

  // Mobile: show link to open in new tab
  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-600">
          {t("prepareTips")}
        </p>
        <a
          href={getJitsiMeetUrl(roomId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--ev-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
        >
          {t("joinExternal")}
        </a>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl border border-slate-200">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
          <div className="size-8 animate-spin rounded-full border-4 border-[var(--ev-green)]/20 border-t-[var(--ev-blue)]" />
        </div>
      )}
      <div ref={containerRef} className="size-full" />
    </div>
  );
}
