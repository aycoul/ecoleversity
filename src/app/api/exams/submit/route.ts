import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculateScore } from "@/lib/exam";

const submitSchema = z.object({
  learnerId: z.string().uuid(),
  examType: z.string().min(1),
  subject: z.string().min(1),
  questionIds: z.array(z.string().uuid()),
  answers: z.array(z.number().int().min(0)),
  durationSeconds: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { learnerId, examType, subject, questionIds, answers, durationSeconds } = parsed.data;

    // Verify learner belongs to parent
    const { data: learner } = await supabase
      .from("learner_profiles")
      .select("id")
      .eq("id", learnerId)
      .eq("parent_id", user.id)
      .single();

    if (!learner) {
      return NextResponse.json({ error: "Élève non autorisé" }, { status: 403 });
    }

    // Fetch correct answers
    const { data: questions } = await supabase
      .from("exam_questions")
      .select("id, correct_answer, explanation")
      .in("id", questionIds);

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Questions non trouvées" }, { status: 404 });
    }

    // Map correct answers in the same order as submitted
    const correctAnswers = questionIds.map((qId) => {
      const q = questions.find((q) => q.id === qId);
      return q?.correct_answer ?? -1;
    });

    const { score, total, percentage } = calculateScore(answers, correctAnswers);

    // Save attempt
    const { data: attempt, error: insertError } = await supabase
      .from("exam_attempts")
      .insert({
        learner_id: learnerId,
        exam_type: examType,
        subject,
        score,
        total_questions: total,
        duration_seconds: durationSeconds,
        answers: questionIds.map((qId, i) => ({
          questionId: qId,
          selected: answers[i],
          correct: correctAnswers[i],
          isCorrect: answers[i] === correctAnswers[i],
        })),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[exams] Submit error:", insertError);
      return NextResponse.json({ error: "Erreur lors de la soumission" }, { status: 500 });
    }

    // Return results with explanations
    const results = questionIds.map((qId, i) => {
      const q = questions.find((q) => q.id === qId);
      return {
        questionId: qId,
        selected: answers[i],
        correct: correctAnswers[i],
        isCorrect: answers[i] === correctAnswers[i],
        explanation: q?.explanation ?? null,
      };
    });

    return NextResponse.json({
      data: {
        attemptId: attempt?.id,
        score,
        total,
        percentage,
        results,
      },
    });
  } catch (err) {
    console.error("[exams] Submit error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
