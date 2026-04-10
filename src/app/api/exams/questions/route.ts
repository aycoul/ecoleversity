import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const querySchema = z.object({
  examType: z.string().min(1),
  subject: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      examType: searchParams.get("examType"),
      subject: searchParams.get("subject"),
      limit: searchParams.get("limit") ?? "20",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { examType, subject, limit } = parsed.data;

    // Fetch random questions for this exam + subject
    const { data: questions, error } = await supabase
      .from("exam_questions")
      .select("id, question_text, options, difficulty")
      .eq("exam_type", examType)
      .eq("subject", subject)
      .limit(limit);

    if (error) {
      console.error("[exams] Questions fetch error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    // Shuffle questions for randomness
    const shuffled = (questions ?? []).sort(() => Math.random() - 0.5);

    return NextResponse.json({ data: shuffled });
  } catch (err) {
    console.error("[exams] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
