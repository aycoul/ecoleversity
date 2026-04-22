import Anthropic from "@anthropic-ai/sdk";

/**
 * Parent-facing session summary — French, ~200 words, factual third-person.
 * Consumed by the email template and the past-session cards on both parent
 * and teacher dashboards. Sections match what a parent actually wants to
 * know: what was taught, what the child understood, what still needs work,
 * and what's coming next.
 */
const SUMMARY_PROMPT = `Tu es un rédacteur pédagogique pour écoleVersity. À partir de la transcription d'un cours particulier en direct, écris un résumé destiné au parent de l'élève, en français.

Format strict (utilise exactement ces titres en gras, séparés par des sauts de ligne) :

**Sujets abordés**
Une à deux phrases listant ce qui a été vu pendant le cours.

**Concepts clés**
Deux à trois points concis sur les notions expliquées (bullets avec "•").

**Progrès observé**
Une ou deux phrases factuelles sur ce que l'élève a compris ou sur ses difficultés. Ne porte pas de jugement — reste descriptif.

**Prochaines étapes**
Une ou deux recommandations concrètes pour la prochaine session ou pour réviser à la maison.

Règles :
- Écris à la troisième personne ("l'élève a montré...", "le cours a couvert...").
- Pas d'emoji. Pas de formule de politesse.
- Maximum 200 mots au total.
- Même si la transcription est brève ou ne couvre qu'une prise de contact, rédige un résumé honnête : décris ce qui s'est passé (introduction, évaluation initiale, discussion d'objectifs, problème technique rencontré...). Ne réponds "Session trop courte pour générer un résumé." UNIQUEMENT si la transcription fait moins de trois phrases utiles.`;

export async function buildSessionSummary(transcript: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const trimmed = transcript.trim();
  if (trimmed.length < 50) {
    return "Session trop courte pour générer un résumé.";
  }

  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: SUMMARY_PROMPT,
    messages: [{ role: "user", content: trimmed }],
  });

  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    return "Session trop courte pour générer un résumé.";
  }
  // Strip occasional markdown fences Claude adds around structured output.
  return block.text
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
