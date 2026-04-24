"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type DataPublishOptions, type RemoteParticipant } from "livekit-client";
import { useTranslations } from "next-intl";
import { Captions as CaptionsIcon, CaptionsOff } from "lucide-react";

// Browser-native Web Speech API captioning. Each participant who enables
// captions transcribes their OWN microphone locally and broadcasts the
// text via LiveKit data channel. Other participants render incoming
// captions as an overlay at the bottom of the video area.
//
// v1 — free, zero infra, client-side only. Chrome/Edge work well; Safari
// works via webkitSpeechRecognition; Firefox is unreliable (API missing
// on many installs) — we surface a "non supporté" message at toggle time.
// v2 would be a server-side LiveKit agent + Whisper Realtime.

type CaptionMsg = {
  type: "caption";
  text: string;
  final: boolean;
  speakerName: string;
  timestamp: number;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const encode = (m: unknown) => new TextEncoder().encode(JSON.stringify(m));
const CAPTION_DISPLAY_MS = 6000;

// Belongs in the control bar. Toggles local speech recognition and
// broadcasts resulting transcripts. No UI beyond the button.
//
// If the browser doesn't support the Web Speech API (iOS Safari sometimes,
// Firefox always, some Android Chrome builds) we render NOTHING — no
// button, no error alert, no broken promise. The feature silently
// disappears for users whose device can't support it.
export function CaptionsToggle({ locale }: { locale: "fr" | "en" }) {
  const t = useTranslations("session");
  const room = useRoomContext();
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSentRef = useRef<number>(0);

  // Detect support on mount (useEffect, not during render, to avoid SSR
  // checking a client-only API).
  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      recogRef.current?.stop();
      recogRef.current = null;
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recog = new Ctor();
    recog.lang = locale === "fr" ? "fr-FR" : "en-US";
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (e: unknown) => {
      const event = e as {
        resultIndex: number;
        results: Array<Array<{ transcript: string }> & { isFinal: boolean }>;
      };
      const res = event.results[event.resultIndex];
      if (!res) return;
      const transcript = res[0]?.transcript ?? "";
      const isFinal = res.isFinal;

      // Throttle interim results to ~3/sec; always let finals through.
      const now = Date.now();
      if (!isFinal && now - lastSentRef.current < 300) return;
      lastSentRef.current = now;

      const text = transcript.trim();
      if (!text) return;
      const speakerName =
        room.localParticipant.name || room.localParticipant.identity;
      const msg: CaptionMsg = {
        type: "caption",
        text,
        final: isFinal,
        speakerName,
        timestamp: now,
      };
      // Broadcast to remote peers…
      room.localParticipant.publishData(encode(msg), {
        reliable: false,
      } as DataPublishOptions);
      // …and fire a local-only event so the CaptionsOverlay on THIS
      // client can render the speaker's own captions. Previously the
      // overlay ignored the local participant and the speaker saw
      // nothing while speaking — indistinguishable from "broken."
      window.dispatchEvent(
        new CustomEvent("ecoleversity:local-caption", { detail: msg })
      );
    };

    recog.onerror = (e: unknown) => {
      const err = e as { error?: string };
      if (err.error && err.error !== "no-speech" && err.error !== "aborted") {
        console.warn("[captions] recognition error:", err.error);
      }
    };

    recog.onend = () => {
      if (recogRef.current === recog) {
        try {
          recog.start();
        } catch {
          // double-start throws
        }
      }
    };

    try {
      recog.start();
      recogRef.current = recog;
    } catch (err) {
      console.warn("[captions] could not start:", err);
    }

    return () => {
      recogRef.current = null;
      try {
        recog.stop();
      } catch {
        // ignore
      }
    };
  }, [enabled, locale, room]);

  // Hidden entirely on unsupported browsers — don't tease a feature we can't deliver.
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => setEnabled((v) => !v)}
      className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        enabled
          ? "bg-[var(--ev-green)] text-white"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
      title={enabled ? t("captionsOffTooltip") : t("captionsOnTooltip")}
    >
      {enabled ? <CaptionsIcon className="size-4" /> : <CaptionsOff className="size-4" />}
      {t("captions")}
    </button>
  );
}

// Belongs inside the video area. Displays captions from both remote
// participants (via LiveKit data channel) and the local speaker (via
// a synthetic CustomEvent fired by CaptionsToggle). Without the local
// echo, a teacher testing alone wouldn't see their own captions and
// would think the feature was broken.
export function CaptionsOverlay() {
  const room = useRoomContext();
  const [current, setCurrent] = useState<{
    speakerName: string;
    text: string;
    at: number;
  } | null>(null);

  // Remote captions from LiveKit data channel
  useEffect(() => {
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (!participant) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as CaptionMsg;
        if (msg.type !== "caption" || !msg.text) return;
        setCurrent({ speakerName: msg.speakerName, text: msg.text, at: Date.now() });
      } catch {
        // ignore
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  // Local captions via CaptionsToggle's CustomEvent
  useEffect(() => {
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<CaptionMsg>).detail;
      if (!detail || !detail.text) return;
      setCurrent({ speakerName: detail.speakerName, text: detail.text, at: Date.now() });
    };
    window.addEventListener("ecoleversity:local-caption", onLocal);
    return () => window.removeEventListener("ecoleversity:local-caption", onLocal);
  }, []);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => {
      setCurrent((c) =>
        c && Date.now() - c.at >= CAPTION_DISPLAY_MS - 100 ? null : c
      );
    }, CAPTION_DISPLAY_MS);
    return () => clearTimeout(id);
  }, [current]);

  if (!current) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="pointer-events-auto max-w-3xl rounded-lg bg-black/75 px-4 py-2 text-center text-sm text-white shadow-lg backdrop-blur">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/60">
          {current.speakerName}
        </div>
        <div className="mt-0.5 leading-snug">{current.text}</div>
      </div>
    </div>
  );
}
