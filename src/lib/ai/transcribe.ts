/**
 * Whisper transcription for LiveKit recordings.
 *
 * The recording mp4 lives on Cloudflare R2. We sign a short-lived GET,
 * stream the bytes into a multipart/form-data POST to the OpenAI
 * transcriptions endpoint, and return Whisper's verbose_json response
 * (text + timestamped segments).
 *
 * Size constraint: OpenAI caps uploads at 25MB. Short test recordings
 * are well under that. Longer production classes will need audio
 * extraction (ffmpeg) before this call — we throw a typed error so the
 * caller can mark the row 'failed' with a readable message.
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

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly kind: "missing_key" | "file_too_large" | "download_failed" | "api_error"
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
  const blob = await res.blob();
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new TranscribeError(
      `File is ${Math.round(blob.size / 1024 / 1024)}MB, Whisper limit is 25MB. ` +
        `Extract audio-only track first.`,
      "file_too_large"
    );
  }

  const form = new FormData();
  form.append("file", blob, "recording.mp4");
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
}
