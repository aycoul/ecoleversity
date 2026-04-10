import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** GET: Search help articles */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");

    let dbQuery = supabase
      .from("help_articles")
      .select("id, title, slug, category, excerpt, created_at")
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (category) {
      dbQuery = dbQuery.eq("category", category);
    }

    if (query && query.length >= 2) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
    }

    const { data: articles, error } = await dbQuery.limit(30);

    if (error) {
      console.error("[help] Search error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ data: articles ?? [] });
  } catch (err) {
    console.error("[help] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
