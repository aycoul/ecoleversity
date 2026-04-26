import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import {
  loadFinanceSnapshot,
  type Granularity,
  type CompareMode,
} from "@/lib/admin/finance-data";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/finance-insights
 *
 * Body: { days, granularity, compareMode }
 *
 * Generates a short, actionable list of business recommendations from
 * the current finance snapshot. Calls Claude Haiku for a concise,
 * structured response. Founder + finance + analytics_viewer scopes can
 * read this; rate-limited per admin to keep API spend bounded.
 */

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (
    profile?.role !== "admin" ||
    !(canAccess(scope, "finance") || canAccess(scope, "analytics"))
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Cap each admin to 12 insight generations per hour — each call hits
  // Claude and costs real money. Insights are deterministic enough for
  // a given snapshot that re-running rarely helps.
  const limit = await rateLimit("finance-insights", user.id, 12, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    days?: number;
    granularity?: Granularity;
    compareMode?: CompareMode;
  };
  const days = Math.min(Math.max(Number(body.days) || 30, 7), 365);
  const granularity: Granularity =
    body.granularity === "day" || body.granularity === "week" || body.granularity === "month"
      ? body.granularity
      : days <= 30
        ? "day"
        : "week";
  const compareMode: CompareMode =
    body.compareMode === "previous_year" ? "previous_year" : "previous_period";

  const snap = await loadFinanceSnapshot({ days, granularity, compareMode });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée" },
      { status: 503 }
    );
  }

  // Compress the snapshot to the bullet form Claude needs — full bucket
  // arrays would balloon the prompt without adding signal.
  const compactSeries = snap.buckets.map((b) => ({
    p: b.label,
    gmv: b.gmvXof,
    com: b.commissionXof,
    pay: b.payoutsXof,
    ref: b.refundsXof,
    n: b.txCount,
  }));
  const compareSeries = snap.comparisonBuckets;

  const summary = {
    period: { days, granularity, compareMode },
    totals: snap.totals,
    previousTotals: snap.previousTotals,
    byProvider: snap.byProvider,
    topTeachers: snap.topTeachers.map((t) => ({
      name: t.displayName,
      gmv: t.gmvXof,
      sessions: t.txCount,
    })),
    series: compactSeries,
    comparisonSeries: compareSeries,
  };

  const systemPrompt = `Tu es analyste financier pour EcoleVersity, une plateforme de cours particuliers en ligne pour la Côte d'Ivoire (parents et élèves K-12). La plateforme prend 20% de commission sur chaque session payée, et reverse 80% à l'enseignant.

Ton rôle : à partir des données fournies, produire des recommandations CONCRÈTES, ACTIONNABLES, en français, classées par impact attendu. Sois direct, chiffré, jamais générique. Réponds en JSON strict.

Format de réponse OBLIGATOIRE :
{
  "diagnosis": "1-2 phrases qui résument la santé financière sur la période et le delta vs comparaison",
  "growthSignals": [{"signal": "...", "evidence": "..."}],
  "recommendations": [
    {
      "title": "Titre court et actionnable",
      "category": "revenue | retention | teacher_help | pricing | operations",
      "priority": "high | medium | low",
      "rationale": "Pourquoi, avec un chiffre tiré des données",
      "action": "Action concrète à exécuter cette semaine"
    }
  ]
}

Idéalement 4-6 recommandations. Couvre au moins :
- au moins une de croissance du revenu (acquisition / panier moyen / dynamic pricing)
- au moins une rétention (parents qui ne reviennent pas, churn enseignant)
- au moins une "aider les enseignants" (top performers, ceux qui décrochent)
- une pricing ou demand-driven si signal disponible
N'invente JAMAIS de chiffres absents des données. Si une dimension manque (ex: pas de cohort retention) dis-le et propose comment l'instrumenter.`;

  const userPrompt = `Données financières d'EcoleVersity :\n\n${JSON.stringify(summary, null, 2)}\n\nGénère le JSON d'analyse maintenant.`;

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const reply = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = reply.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    // Claude sometimes wraps JSON in code fences — strip them.
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Réponse IA non parsable", raw: raw.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      compareLabel: snap.compareLabel,
      insights: parsed,
    });
  } catch (err) {
    console.error("[finance-insights] Claude error:", err);
    return NextResponse.json({ error: "Erreur IA" }, { status: 500 });
  }
}
