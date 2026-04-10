import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const SYSTEM_PROMPT = `Tu es Ama, l'assistante virtuelle d'écoleVersity, une plateforme de cours particuliers en ligne pour les élèves de Côte d'Ivoire.

Tu aides les parents et les enseignants en français. Tu es amicale, patiente et professionnelle.

Tes connaissances :
- Les parents trouvent des enseignants vérifiés, réservent des cours en direct (Jitsi), et paient via Orange Money, Wave, ou carte bancaire (Flutterwave)
- Les enseignants définissent leur disponibilité, fixent leurs tarifs, et reçoivent 80% du montant (20% de commission)
- Les paiements sont confirmés automatiquement par SMS ou par webhook Flutterwave
- Les cours en direct se font via Jitsi Meet — caméra et micro nécessaires
- Il existe aussi des cours de groupe et des cours pré-enregistrés
- La plateforme couvre du préscolaire (PS) à la Terminale, toutes séries (A, C, D, E, F, G, H)
- Préparation aux examens : CEPE, BEPC, BAC, Concours 6ème

Règles :
- Réponds toujours en français
- Sois concise (2-3 phrases max sauf si la question est complexe)
- Si tu ne connais pas la réponse, dis-le honnêtement
- Après 3 échanges sans résolution, propose de créer un ticket de support
- Ne donne jamais de fausses informations sur les prix ou les politiques`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Send a message to Ama and get a response */
export async function chatWithAma(
  messages: ChatMessage[],
  userId: string,
): Promise<{ reply: string; shouldEscalate: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      reply: "Je suis désolée, le service Ama n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
      shouldEscalate: false,
    };
  }

  // Fetch relevant help articles for RAG context
  const context = await fetchRelevantArticles(
    messages[messages.length - 1]?.content ?? "",
  );

  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\nArticles d'aide pertinents :\n${context}`
    : SYSTEM_PROMPT;

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemWithContext,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const reply =
      response.content[0]?.type === "text"
        ? response.content[0].text
        : "Je n'ai pas pu générer une réponse.";

    // Suggest escalation after 3+ user messages without resolution
    const userMessageCount = messages.filter((m) => m.role === "user").length;
    const shouldEscalate = userMessageCount >= 3;

    return { reply, shouldEscalate };
  } catch (err) {
    console.error("[ama] Claude API error:", err);
    return {
      reply: "Désolée, une erreur est survenue. Veuillez réessayer.",
      shouldEscalate: false,
    };
  }
}

/** Fetch help articles matching the user's question (simple keyword search) */
async function fetchRelevantArticles(query: string): Promise<string | null> {
  if (!query || query.length < 3) return null;

  const supabase = createAdminClient();

  // Simple text search on title and content
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);

  if (keywords.length === 0) return null;

  const { data: articles } = await supabase
    .from("help_articles")
    .select("title, content")
    .or(keywords.map((k) => `title.ilike.%${k}%,content.ilike.%${k}%`).join(","))
    .limit(3);

  if (!articles || articles.length === 0) return null;

  return articles
    .map((a) => `### ${a.title}\n${a.content.slice(0, 300)}`)
    .join("\n\n");
}
