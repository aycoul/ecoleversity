import type { SupabaseClient } from "@supabase/supabase-js";

type AiTrainingContentRow = {
  training_payload: {
    topics?: string[];
    teacherStyleSignals?: {
      tone?: string[];
      vocabularyLevel?: string;
      pedagogicalPatterns?: string[];
    };
    segments?: Array<{ speaker: string; text: string }>;
  } | null;
  extracted_topics: string[] | null;
};

export type TeachingStyleProfile = {
  persona: {
    tone: string[];
    vocabularyLevel: "simple" | "standard" | "advanced";
    catchPhrases: string[];
  };
  teachingMethod: string[];
  knowledgeScope: {
    topicsSeen: string[];
    sessionsAnalyzed: number;
  };
  updatedAt: string;
};

/**
 * Aggregate every ai_training_content row for a twin into a single style
 * profile. Runs after each new recording finishes post-processing so the
 * profile stays fresh. Cheap: pure JS, no LLM call.
 *
 * Output goes to ai_teacher_twins.teaching_style_profile, where the twin
 * invocation API reads it at conversation time to build the system prompt.
 */
export async function aggregateTeachingStyle(
  admin: SupabaseClient,
  twinId: string
): Promise<TeachingStyleProfile> {
  const { data } = await admin
    .from("ai_training_content")
    .select("training_payload, extracted_topics")
    .eq("twin_id", twinId)
    .returns<AiTrainingContentRow[]>();
  const rows = data ?? [];

  const toneTally = new Map<string, number>();
  const pedTally = new Map<string, number>();
  const topicTally = new Map<string, number>();
  const vocabTally = new Map<string, number>();
  const teacherUtterances: string[] = [];

  for (const r of rows) {
    const sig = r.training_payload?.teacherStyleSignals;
    for (const t of sig?.tone ?? []) toneTally.set(t, (toneTally.get(t) ?? 0) + 1);
    for (const p of sig?.pedagogicalPatterns ?? [])
      pedTally.set(p, (pedTally.get(p) ?? 0) + 1);
    if (sig?.vocabularyLevel)
      vocabTally.set(sig.vocabularyLevel, (vocabTally.get(sig.vocabularyLevel) ?? 0) + 1);
    for (const t of r.training_payload?.topics ?? [])
      topicTally.set(t, (topicTally.get(t) ?? 0) + 1);
    for (const t of r.extracted_topics ?? [])
      topicTally.set(t, (topicTally.get(t) ?? 0) + 1);

    // Collect short teacher utterances; we'll mine catch phrases from them.
    for (const s of r.training_payload?.segments ?? []) {
      if (s.speaker === "teacher" && s.text.length < 80 && s.text.length > 10) {
        teacherUtterances.push(s.text.trim());
      }
    }
  }

  const top = (m: Map<string, number>, n = 8) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);

  // Most frequent vocabulary level wins; fall back to 'standard'.
  const vocabEntries = Array.from(vocabTally.entries()).sort((a, b) => b[1] - a[1]);
  const topVocab = (vocabEntries[0]?.[0] ?? "standard") as
    | "simple"
    | "standard"
    | "advanced";

  // Catch phrases = utterances that recur verbatim across sessions.
  const phraseTally = new Map<string, number>();
  for (const u of teacherUtterances) {
    const key = u.toLowerCase().replace(/[?.!,;:"']/g, "").trim();
    phraseTally.set(key, (phraseTally.get(key) ?? 0) + 1);
  }
  const catchPhrases = Array.from(phraseTally.entries())
    .filter(([, n]) => n >= 2) // at least twice in the corpus
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  const profile: TeachingStyleProfile = {
    persona: {
      tone: top(toneTally, 6),
      vocabularyLevel: ["simple", "standard", "advanced"].includes(topVocab)
        ? topVocab
        : "standard",
      catchPhrases,
    },
    teachingMethod: top(pedTally, 8),
    knowledgeScope: {
      topicsSeen: top(topicTally, 20),
      sessionsAnalyzed: rows.length,
    },
    updatedAt: new Date().toISOString(),
  };

  await admin
    .from("ai_teacher_twins")
    .update({
      teaching_style_profile: profile,
      last_trained_at: profile.updatedAt,
      total_recordings_processed: rows.length,
    })
    .eq("id", twinId);

  return profile;
}
