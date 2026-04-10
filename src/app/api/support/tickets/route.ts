import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const ticketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.enum(["payment", "technical", "teacher", "safety", "other"]).default("other"),
  conversationHistory: z.array(
    z.object({ role: z.string(), content: z.string() }),
  ).optional(),
});

/** POST: Create a support ticket */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: ticket, error } = await adminSupabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: parsed.data.subject,
        description: parsed.data.description,
        category: parsed.data.category,
        conversation_history: parsed.data.conversationHistory ?? null,
        status: "open",
        priority: "normal",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[tickets] Create error:", error);
      return NextResponse.json({ error: "Erreur lors de la création du ticket" }, { status: 500 });
    }

    return NextResponse.json({ data: { ticketId: ticket?.id } });
  } catch (err) {
    console.error("[tickets] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** GET: List user's tickets */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("id, subject, category, status, priority, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ data: tickets ?? [] });
  } catch (err) {
    console.error("[tickets] List error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
