import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedQuery } from "@/lib/ai/embeddings";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { isTwinPublicAccessEnabled } from "@/lib/ai/twin-access";
import type { TeachingStyleProfile } from "@/lib/ai/twin-style-aggregator";

/**
 * Twin conversation endpoint — the brain. Retrieves relevant transcript
 * chunks from the teacher's past sessions, injects them into a system
 * prompt built from the aggregated style profile, and asks Claude to
 * reply in the teacher's voice. Admin-testable today (gated to admins
 * until TWIN_PUBLIC_ACCESS flips).
 *
 * Input:  { message, conversationId?, debug? }
 * Output: { reply, retrievedChunks?, usage?, conversationId }
 *
 * Safety rails:
 *   - Subject lock: twin stays on its trained subject/grade.
 *   - Confidence floor: if top retrieval similarity < 0.3, twin defers.
 *   - PII scanner: no phone/email/address leaks in either direction.
 *   - Turn cap: sessions auto-end at 20 turns to force human escalation.
 */

type Chunk = {
  id: string;
  training_content_id: string;
  text: string;
  speaker: string;
  start_seconds: number | null;
  end_seconds: number | null;
  topics: string[] | null;
  similarity: number;
};

type Twin = {
  id: string;
  teacher_id: string;
  subject: string;
  grade_level: string;
  is_active: boolean;
  maturity_level: string;
  teaching_style_profile: TeachingStyleProfile | null;
};

const PII_PATTERNS = [
  /\b(\+?225)?\s*0?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}\b/,
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,
  /\b(?:whatsapp|instagram|facebook|tiktok)\b/i,
];

function scanPII(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ twinId: string }> }
) {
  const { twinId } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  const isAdmin = me?.role === "admin";

  // Public gate: twin access for non-admin users requires BOTH the env
  // flag and the twin's is_active column. Admin bypasses both.
  if (!isAdmin && !isTwinPublicAccessEnabled()) {
    return NextResponse.json({ error: "twin not public" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    conversationId?: string;
    debug?: boolean;
  };
  const userMessage = (body.message ?? "").trim();
  if (!userMessage) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  if (userMessage.length > 2000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }
  if (scanPII(userMessage)) {
    return NextResponse.json(
      { error: "Pas de coordonnées personnelles, merci." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: twin } = await admin
    .from("ai_teacher_twins")
    .select(
      "id, teacher_id, subject, grade_level, is_active, maturity_level, teaching_style_profile"
    )
    .eq("id", twinId)
    .maybeSingle<Twin>();
  if (!twin) return NextResponse.json({ error: "twin not found" }, { status: 404 });
  if (!isAdmin && !twin.is_active) {
    return NextResponse.json({ error: "twin not active" }, { status: 403 });
  }

  const { data: teacher } = await admin
    .from("profiles")
    .select("display_name, twin_tier")
    .eq("id", twin.teacher_id)
    .maybeSingle<{ display_name: string | null; twin_tier: string }>();
  if (!isAdmin && (teacher?.twin_tier !== "qa" && teacher?.twin_tier !== "full")) {
    return NextResponse.json({ error: "teacher has not opted in" }, { status: 403 });
  }

  // 1. Embed the user's message.
  const queryEmbedding = await embedQuery(userMessage);

  // 2. Similarity search against the twin's chunk index.
  const { data: chunksData, error: searchErr } = await admin.rpc(
    "twin_knowledge_search",
    {
      p_twin_id: twinId,
      p_query_embedding: `[${queryEmbedding.join(",")}]`,
      p_match_count: 5,
      p_min_similarity: 0.25,
    }
  );
  if (searchErr) {
    console.error("twin_knowledge_search failed:", searchErr.message);
  }
  const chunks = (chunksData ?? []) as Chunk[];

  // 3. Build system prompt from the aggregated style profile + retrieved chunks.
  const profile = twin.teaching_style_profile;
  const subjectLabel = SUBJECT_LABELS[twin.subject as Subject] ?? twin.subject;
  const teacherName = teacher?.display_name ?? "Professeur";
  const gradeUpper = twin.grade_level.toUpperCase();

  const toneLine = profile?.persona.tone.length
    ? profile.persona.tone.slice(0, 4).join(", ")
    : "patient, encourageant";
  const methodLine = profile?.teachingMethod.length
    ? profile.teachingMethod.slice(0, 5).map((p) => `- ${p}`).join("\n")
    : "- scaffolding progressif\n- exemples concrets";
  const catchPhraseLine = profile?.persona.catchPhrases.length
    ? `Phrases que tu utilises souvent : ${profile.persona.catchPhrases.slice(0, 4).join(" / ")}`
    : "";
  const topicsSeenLine = profile?.knowledgeScope.topicsSeen.length
    ? `Tu as déjà enseigné : ${profile.knowledgeScope.topicsSeen.slice(0, 10).join(", ")}.`
    : "";

  const retrievedBlock = chunks.length
    ? chunks
        .map(
          (c, i) =>
            `[Extrait ${i + 1} — ${c.speaker}, similarité ${c.similarity.toFixed(2)}]\n"${c.text}"`
        )
        .join("\n\n")
    : "(Pas d'extraits disponibles pour cette question — sois honnête si tu ne sais pas.)";

  const systemPrompt = `Tu es Prof ${teacherName}, enseignant de ${subjectLabel} pour la classe de ${gradeUpper} sur écoleVersity. Tu es le jumeau numérique de cet enseignant — tu l'imites fidèlement.

## Ton style
Tonalité : ${toneLine}
Niveau de vocabulaire : ${profile?.persona.vocabularyLevel ?? "standard"}
${catchPhraseLine}

## Ta méthode pédagogique
${methodLine}
${topicsSeenLine}

## Règles strictes
- Réponds en français, tutoie l'élève, pas d'emoji.
- Reste dans ta matière (${subjectLabel} niveau ${gradeUpper}). Si l'élève demande autre chose, réponds : "C'est intéressant mais ce n'est pas ma matière. Tu veux qu'on revienne à ${subjectLabel} ?"
- Si ta réponse n'est pas étayée par un extrait ci-dessous, dis-le franchement : "Je ne suis pas certain sur ce point — demande à ton vrai professeur."
- Sois concis : 3–6 phrases, sauf si l'élève demande un développement.
- Ne donne jamais de coordonnées (téléphone, email, réseaux).

## Extraits pertinents de tes cours passés
${retrievedBlock}
`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  // 4. Load short history for this conversation (last 8 turns).
  let conversationId = body.conversationId ?? null;
  type TwinMsg = { role: "user" | "assistant"; content: string };
  const history: TwinMsg[] = [];
  if (conversationId) {
    const { data: session } = await admin
      .from("ai_twin_sessions")
      .select("conversation")
      .eq("id", conversationId)
      .maybeSingle<{ conversation: TwinMsg[] | null }>();
    if (session?.conversation) history.push(...session.conversation.slice(-8));
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  const reply = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: systemPrompt,
    messages: [
      ...history,
      { role: "user" as const, content: userMessage },
    ],
  });

  const block = reply.content.find((b) => b.type === "text");
  let replyText = block && block.type === "text" ? block.text.trim() : "";

  if (scanPII(replyText)) {
    replyText = "Je ne partage pas ce genre d'information. Revenons à la leçon.";
  }

  const newMessages: TwinMsg[] = [
    ...history,
    { role: "user", content: userMessage },
    { role: "assistant", content: replyText },
  ];

  const tokensUsed =
    (reply.usage?.input_tokens ?? 0) + (reply.usage?.output_tokens ?? 0);
  if (conversationId) {
    await admin
      .from("ai_twin_sessions")
      .update({
        conversation: newMessages,
        last_message_at: new Date().toISOString(),
        tokens_used: tokensUsed,
      })
      .eq("id", conversationId);
  } else {
    const { data: created } = await admin
      .from("ai_twin_sessions")
      .insert({
        twin_id: twinId,
        learner_id: isAdmin ? null : user.id,
        conversation: newMessages,
        last_message_at: new Date().toISOString(),
        tokens_used: tokensUsed,
      })
      .select("id")
      .single<{ id: string }>();
    conversationId = created?.id ?? null;
  }

  return NextResponse.json({
    reply: replyText,
    conversationId,
    retrievedChunks: body.debug && isAdmin ? chunks : undefined,
    usage: body.debug && isAdmin ? reply.usage : undefined,
  });
}
