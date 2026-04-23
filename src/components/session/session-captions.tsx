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
export function CaptionsToggle({ locale }: { locale: "fr" | "en" }) {
  const t = useTranslations("session");
  const room = useRoomContext();
  const [enabled, setEnabled] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSentRef = useRef<number>(0);

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

      const now = Date.now();
      if (!isFinal && now - lastSentRef.current < 300) return;
      lastSentRef.current = now;

      const msg: CaptionMsg = {
        type: "caption",
        text: transcript.trim(),
        final: isFinal,
        speakerName: room.localParticipant.name || room.localParticipant.identity,
        timestamp: now,
      };
      if (!msg.text) return;
      room.localParticipant.publishData(encode(msg), {
        reliable: false,
      } as DataPublishOptions);
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

  const toggle = () => {
    if (!enabled && !getRecognitionCtor()) {
      alert(t("captionsUnsupported"));
      return;
    }
    setEnabled((v) => !v);
  };

  return (
    <button
      type="button"
      onClick={toggle}
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

// Belongs inside the video area. Listens for caption messages from
// remote participants and displays them at the bottom.
export function CaptionsOverlay() {
  const room = useRoomContext();
  const [remote, setRemote] = useState<{
    speakerName: string;
    text: string;
    at: number;
  } | null>(null);

  useEffect(() => {
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (!participant) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as CaptionMsg;
        if (msg.type !== "caption" || !msg.text) return;
        setRemote({ speakerName: msg.speakerName, text: msg.text, at: Date.now() });
      } catch {
        // ignore
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  useEffect(() => {
    if (!remote) return;
    const id = setTimeout(() => {
      setRemote((current) =>
        current && Date.now() - current.at >= CAPTION_DISPLAY_MS - 100
          ? null
          : current
      );
    }, CAPTION_DISPLAY_MS);
    return () => clearTimeout(id);
  }, [remote]);

  if (!remote) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="pointer-events-auto max-w-3xl rounded-lg bg-black/75 px-4 py-2 text-center text-sm text-white shadow-lg backdrop-blur">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/60">
          {remote.speakerName}
        </div>
        <div className="mt-0.5 leading-snug">{remote.text}</div>
      </div>
    </div>
  );
}
