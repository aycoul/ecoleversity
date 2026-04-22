/**
 * Whisper transcription for LiveKit recordings.
 *
 * Pipeline: sign an R2 GET → download mp4 → extract audio-only mp3 with
 * ffmpeg (keeps the upload under Whisper's 25MB limit regardless of class
 * length) → stream mp3 into a multipart POST to OpenAI's transcriptions
 * endpoint → parse verbose_json (text + timestamped segments).
 */

export type WhisperSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

export type WhisperResult = {
  language: string;
  durationSeconds: number;
  text: string;
  segments: WhisperSegment[];
};

import { promises as fs } from "node:fs";
import { extractAudioToTempFile } from "@/lib/ai/extract-audio";

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "missing_key"
      | "file_too_large"
      | "download_failed"
      | "api_error"
      | "audio_extract_failed"
  ) {
    super(message);
  }
}

export async function transcribeRecording(signedR2Url: string): Promise<WhisperResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TranscribeError("OPENAI_API_KEY not set", "missing_key");
  }

  const res = await fetch(signedR2Url);
  if (!res.ok) {
    throw new TranscribeError(
      `R2 download failed: ${res.status} ${res.statusText}`,
      "download_failed"
    );
  }
  const videoBlob = await res.blob();

  let audioBlob: Blob;
  let cleanup: (() => Promise<void>) | null = null;
  try {
    const extracted = await extractAudioToTempFile(videoBlob);
    cleanup = extracted.cleanup;
    const mp3Bytes = await fs.readFile(extracted.path);
    // Wrap the Buffer in a Blob so FormData adds the correct filename + type.
    audioBlob = new Blob([new Uint8Array(mp3Bytes)], { type: "audio/mpeg" });
  } catch (err) {
    if (cleanup) await cleanup();
    throw new TranscribeError(
      `Audio extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      "audio_extract_failed"
    );
  }

  if (audioBlob.size > MAX_UPLOAD_BYTES) {
    if (cleanup) await cleanup();
    throw new TranscribeError(
      `Extracted audio is ${Math.round(audioBlob.size / 1024 / 1024)}MB, ` +
        `over Whisper's 25MB limit. Lower the audio bitrate or chunk the file.`,
      "file_too_large"
    );
  }

  try {
    const form = new FormData();
    form.append("file", audioBlob, "recording.mp3");
    form.append("model", "whisper-1");
    form.append("language", "fr");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const openaiRes = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!openaiRes.ok) {
      const detail = await openaiRes.text().catch(() => "");
      throw new TranscribeError(
        `Whisper API ${openaiRes.status}: ${detail.slice(0, 200)}`,
        "api_error"
      );
    }

    const data = (await openaiRes.json()) as {
      language?: string;
      duration?: number;
      text?: string;
      segments?: Array<{ id: number; start: number; end: number; text: string }>;
    };

    return {
      language: data.language ?? "fr",
      durationSeconds: Math.round(data.duration ?? 0),
      text: (data.text ?? "").trim(),
      segments: (data.segments ?? []).map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      })),
    };
  } finally {
    if (cleanup) await cleanup();
  }
}
