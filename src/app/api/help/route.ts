import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80).optional(),
  category: z.string().trim().min(1).max(40).optional(),
});

/** GET: Search help articles */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ data: [] });
    }
    const { q, category } = parsed.data;

    let dbQuery = supabase
      .from("help_articles")
      .select("id, title, slug, category, excerpt, created_at")
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (category) {
      dbQuery = dbQuery.eq("category", category);
    }

    if (q) {
      // Use Postgres full-text search instead of building an or-filter
      // from raw user input — PostgREST treats `,` and `)` specially
      // inside or() expressions, which previously made the route
      // injectable by a query containing those characters.
      // websearch syntax accepts plain user typing like "comment payer".
      dbQuery = dbQuery.textSearch("fts", q, {
        type: "websearch",
        config: "french",
      });
    }

    const { data: articles, error } = await dbQuery.limit(30);

    if (error) {
      // Fall back to a safe ilike with sanitised input when the fts
      // column doesn't exist (older help_articles deployments).
      const safe = q ? q.replace(/[,()%_\\]/g, " ").trim() : "";
      if (q && safe.length >= 2) {
        const fallback = supabase
          .from("help_articles")
          .select("id, title, slug, category, excerpt, created_at")
          .eq("published", true)
          .ilike("title", `%${safe}%`)
          .order("sort_order", { ascending: true })
          .limit(30);
        const { data: fallbackData } = await fallback;
        return NextResponse.json({ data: fallbackData ?? [] });
      }
      console.error("[help] Search error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ data: articles ?? [] });
  } catch (err) {
    console.error("[help] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
