import Anthropic from "@anthropic-ai/sdk";
import type { TwinTrainingPayload } from "@/lib/ai/twin-payload";

/**
 * Structure extraction for the session-twin — the data needed to let the
 * eventual twin run a full 45-min class as the teacher:
 *
 *   - lesson_phases: classify the recording into intro → teach → practice →
 *     recap so the twin trainer knows the shape of a real lesson.
 *   - exercises: problem bank the twin can re-pose during the practice phase.
 *   - explanations: canonical explanation blocks the twin can reuse during
 *     the teach phase (keyed by concept).
 *
 * One Claude call per recording. Adds ~€0.05 per session. No transcript
 * re-parsing at training time — the future trainer reads these JSON rows
 * directly.
 */

export type LessonPhase = {
  label: "intro" | "explanation" | "example" | "practice" | "recap" | "other";
  startSegmentIdx: number;
  endSegmentIdx: number;
  summary: string;
};

export type ExerciseItem = {
  statement: string;
  workedSolution: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
};

export type ExplanationItem = {
  concept: string;
  explanation: string;
  examples: string[];
};

export type LessonExtraction = {
  phases: LessonPhase[];
  exercises: ExerciseItem[];
  explanations: ExplanationItem[];
};

const EXTRACT_PROMPT = `Tu reçois la transcription structurée d'un cours particulier (segments avec speaker + timestamps). Ta mission : extraire la structure pédagogique pour permettre à un agent "jumeau numérique" de rejouer ce type de cours plus tard.

Schéma JSON (toutes les clés présentes, même si vides) :
{
  "phases": [
    {
      "label": "intro" | "explanation" | "example" | "practice" | "recap" | "other",
      "startSegmentIdx": <number>,
      "endSegmentIdx": <number>,
      "summary": "<résumé court de la phase, 1-2 phrases>"
    }
  ],
  "exercises": [
    {
      "statement": "<énoncé du problème tel que posé par l'enseignant>",
      "workedSolution": "<solution raisonnée telle qu'expliquée>",
      "difficulty": "easy" | "medium" | "hard",
      "topic": "<sujet court, ex: fractions>"
    }
  ],
  "explanations": [
    {
      "concept": "<notion enseignée, ex: théorème de Pythagore>",
      "explanation": "<bloc d'explication canonique en français>",
      "examples": ["<exemple concret 1>", "<exemple concret 2>"]
    }
  ]
}

Règles :
- "phases" : au moins 1 entrée couvrant la séance. Labels possibles : intro (prise de contact, objectifs), explanation (enseigne une notion), example (montre un cas concret), practice (fait faire un exercice), recap (synthèse). Si rien ne colle, "other".
- "exercises" : uniquement si un énoncé clair + solution ont été donnés. Peut être vide.
- "explanations" : uniquement si un concept a été enseigné de bout en bout. Peut être vide.
- Garde le texte original quand tu cites l'enseignant ; ne paraphrase pas inutilement.
- Réponds UNIQUEMENT avec du JSON valide, aucun texte additionnel, aucun \`\`\`.`;

export async function extractLessonStructure(
  payload: TwinTrainingPayload
): Promise<LessonExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  if (payload.segments.length === 0) {
    return { phases: [], exercises: [], explanations: [] };
  }

  const client = new Anthropic({ apiKey });
  const userMsg = JSON.stringify({
    subject: payload.sessionMetadata.subject,
    gradeLevel: payload.sessionMetadata.gradeLevel,
    segments: payload.segments.map((s, idx) => ({
      idx,
      t: s.t,
      speaker: s.speaker,
      text: s.text,
    })),
  });

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: EXTRACT_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    return { phases: [], exercises: [], explanations: [] };
  }
  const raw = block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(raw) as Partial<LessonExtraction>;
    return {
      phases: (parsed.phases ?? []).map((p) => ({
        label: normalizeLabel(p.label),
        startSegmentIdx: Number(p.startSegmentIdx) || 0,
        endSegmentIdx: Number(p.endSegmentIdx) || 0,
        summary: String(p.summary ?? ""),
      })),
      exercises: (parsed.exercises ?? []).map((e) => ({
        statement: String(e.statement ?? ""),
        workedSolution: String(e.workedSolution ?? ""),
        difficulty: normalizeDifficulty(e.difficulty),
        topic: String(e.topic ?? ""),
      })),
      explanations: (parsed.explanations ?? []).map((x) => ({
        concept: String(x.concept ?? ""),
        explanation: String(x.explanation ?? ""),
        examples: (x.examples ?? []).map(String),
      })),
    };
  } catch {
    return { phases: [], exercises: [], explanations: [] };
  }
}

function normalizeLabel(label: unknown): LessonPhase["label"] {
  const allowed: LessonPhase["label"][] = [
    "intro",
    "explanation",
    "example",
    "practice",
    "recap",
    "other",
  ];
  return allowed.includes(label as LessonPhase["label"])
    ? (label as LessonPhase["label"])
    : "other";
}

function normalizeDifficulty(d: unknown): ExerciseItem["difficulty"] {
  return d === "easy" || d === "medium" || d === "hard" ? d : "medium";
}
