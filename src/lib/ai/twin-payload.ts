import Anthropic from "@anthropic-ai/sdk";
import type { WhisperSegment } from "@/lib/ai/transcribe";

/**
 * Twin-ready training payload — the single structured document a future
 * training job reads per session. Designed so the downstream embedder can
 * chunk segments, the RAG retriever can filter by topic/speaker, and the
 * style profiler can aggregate `teacher_style_signals` across sessions
 * without re-parsing raw Whisper output.
 *
 * Schema is versioned (payload_version column) so we can evolve it
 * without breaking already-processed rows.
 */
export type TwinTrainingPayload = {
  version: 1;
  language: string;
  sessionMetadata: {
    subject: string | null;
    gradeLevel: string | null;
    durationSeconds: number;
  };
  segments: Array<{
    t: number;
    end: number;
    speaker: "teacher" | "student" | "unknown";
    text: string;
  }>;
  topics: string[];
  qAndA: Array<{ question: string; answerSummary: string }>;
  teacherStyleSignals: {
    tone: string[];
    vocabularyLevel: "simple" | "standard" | "advanced";
    pedagogicalPatterns: string[];
  };
};

const STRUCTURE_PROMPT = `Tu reçois la transcription brute d'un cours particulier (élève + enseignant, en français). Ta mission : structurer cette transcription en JSON strictement conforme au schéma ci-dessous, pour servir à entraîner un agent "jumeau numérique" de l'enseignant.

Schéma JSON (obligatoire, toutes les clés présentes) :
{
  "segments": [
    { "t": <number>, "end": <number>, "speaker": "teacher" | "student" | "unknown", "text": "<string>" }
  ],
  "topics": ["<string>", ...],
  "qAndA": [ { "question": "<string>", "answerSummary": "<string>" } ],
  "teacherStyleSignals": {
    "tone": ["<string>", ...],
    "vocabularyLevel": "simple" | "standard" | "advanced",
    "pedagogicalPatterns": ["<string>", ...]
  }
}

Règles :
- TOUJOURS remplir "segments" avec les rawSegments fournis, en ajoutant un "speaker". Si tu n'es pas sûr, utilise "unknown" — ne laisse jamais le tableau vide.
- "topics" : 1 à 6 sujets en français, courts et concrets (ex. "mathématiques troisième", "objectifs scolaires", "introduction"). Retourne au moins 1 sujet.
- "qAndA" : 1 à 5 paires. Peut être vide uniquement si aucune question n'est posée.
- "teacherStyleSignals.tone" : au moins 1 adjectif observé. "vocabularyLevel" : toujours requis.
- Ne réécris pas le contenu — conserve le texte original des segments.
- Réponds UNIQUEMENT avec du JSON valide, aucun texte additionnel, aucun \`\`\`.`;

export async function buildTwinPayload(opts: {
  segments: WhisperSegment[];
  language: string;
  durationSeconds: number;
  subject: string | null;
  gradeLevel: string | null;
}): Promise<TwinTrainingPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const rawSegments = opts.segments.map((s) => ({
    t: Math.round(s.start * 10) / 10,
    end: Math.round(s.end * 10) / 10,
    text: s.text,
  }));

  const userMsg = JSON.stringify({
    sessionMetadata: {
      subject: opts.subject,
      gradeLevel: opts.gradeLevel,
      durationSeconds: opts.durationSeconds,
    },
    rawSegments,
  });

  // Longer classes produce many segments. Claude Haiku 4.5 supports larger
  // outputs; we give it headroom so the JSON isn't truncated mid-array.
  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: STRUCTURE_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text block for twin payload");
  }

  // Claude sometimes wraps JSON in ```json fences despite the instruction.
  // Strip fences defensively before parsing so a single stubborn response
  // doesn't poison the whole pipeline.
  const raw = block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(raw) as Partial<TwinTrainingPayload>;

  return {
    version: 1,
    language: opts.language,
    sessionMetadata: {
      subject: opts.subject,
      gradeLevel: opts.gradeLevel,
      durationSeconds: opts.durationSeconds,
    },
    segments: (parsed.segments ?? []).map((s) => ({
      t: Number(s.t) || 0,
      end: Number(s.end) || 0,
      speaker: s.speaker === "teacher" || s.speaker === "student" ? s.speaker : "unknown",
      text: String(s.text ?? ""),
    })),
    topics: (parsed.topics ?? []).map(String).slice(0, 6),
    qAndA: (parsed.qAndA ?? []).slice(0, 5).map((qa) => ({
      question: String(qa.question ?? ""),
      answerSummary: String(qa.answerSummary ?? ""),
    })),
    teacherStyleSignals: {
      tone: (parsed.teacherStyleSignals?.tone ?? []).map(String).slice(0, 5),
      vocabularyLevel:
        parsed.teacherStyleSignals?.vocabularyLevel === "simple" ||
        parsed.teacherStyleSignals?.vocabularyLevel === "standard" ||
        parsed.teacherStyleSignals?.vocabularyLevel === "advanced"
          ? parsed.teacherStyleSignals.vocabularyLevel
          : "standard",
      pedagogicalPatterns: (parsed.teacherStyleSignals?.pedagogicalPatterns ?? [])
        .map(String)
        .slice(0, 5),
    },
  };
}
