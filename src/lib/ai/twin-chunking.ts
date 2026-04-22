import type { TwinTrainingPayload } from "@/lib/ai/twin-payload";

/**
 * Chunk a recording's segments into retrieval-sized blocks for the RAG
 * index. Groups consecutive segments by the same speaker up to a soft
 * character budget so chunks stay coherent ("Prof Ibrahim explaining X
 * for 90 seconds" stays as one chunk instead of being shredded mid-
 * sentence).
 *
 * Default target: ~500 chars per chunk. Safe under OpenAI's 8k-token
 * input limit and small enough that similarity search returns tightly
 * scoped results.
 */

export type TwinChunk = {
  chunkIndex: number;
  speaker: "teacher" | "student" | "unknown" | "mixed";
  text: string;
  startSeconds: number;
  endSeconds: number;
  topics: string[];
};

const TARGET_CHARS = 500;

export function chunkSegments(payload: TwinTrainingPayload): TwinChunk[] {
  const chunks: TwinChunk[] = [];
  let buf: {
    speakers: Set<string>;
    text: string;
    start: number;
    end: number;
  } | null = null;

  const flush = () => {
    if (!buf) return;
    chunks.push({
      chunkIndex: chunks.length,
      speaker:
        buf.speakers.size === 1
          ? (buf.speakers.values().next().value as "teacher" | "student" | "unknown")
          : "mixed",
      text: buf.text.trim(),
      startSeconds: buf.start,
      endSeconds: buf.end,
      topics: payload.topics,
    });
    buf = null;
  };

  for (const s of payload.segments) {
    if (!buf) {
      buf = {
        speakers: new Set([s.speaker]),
        text: s.text,
        start: s.t,
        end: s.end,
      };
      continue;
    }
    // Same speaker or the current buf is still small → keep accreting.
    const wouldExceed = buf.text.length + s.text.length + 1 > TARGET_CHARS;
    const speakerChanged = !buf.speakers.has(s.speaker);
    if (!wouldExceed && !speakerChanged) {
      buf.text += " " + s.text;
      buf.end = s.end;
      continue;
    }
    // Speaker switch or buffer full — flush and start fresh.
    flush();
    buf = {
      speakers: new Set([s.speaker]),
      text: s.text,
      start: s.t,
      end: s.end,
    };
  }
  flush();

  // Drop empty or vanishingly small chunks; they hurt retrieval quality.
  return chunks.filter((c) => c.text.length >= 30);
}
