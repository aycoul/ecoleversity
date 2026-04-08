import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const progressSchema = z.object({
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  completed: z.boolean(),
  watchPositionSeconds: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = progressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { enrollmentId, lessonId, completed, watchPositionSeconds } =
      parsed.data;

    const supabase = await createServerSupabaseClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Verify enrollment belongs to one of this parent's learners
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, course_id, learner_id")
      .eq("id", enrollmentId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Inscription non trouvee" },
        { status: 404 }
      );
    }

    const { data: learner } = await supabase
      .from("learner_profiles")
      .select("id, parent_id")
      .eq("id", enrollment.learner_id)
      .eq("parent_id", user.id)
      .single();

    if (!learner) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 403 }
      );
    }

    // Verify lesson belongs to the enrolled course
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, course_id")
      .eq("id", lessonId)
      .eq("course_id", enrollment.course_id)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: "Lecon non trouvee" },
        { status: 404 }
      );
    }

    // Upsert lesson progress
    const { error: upsertError } = await supabase
      .from("lesson_progress")
      .upsert(
        {
          enrollment_id: enrollmentId,
          lesson_id: lessonId,
          completed,
          watch_position_seconds: watchPositionSeconds ?? 0,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "enrollment_id,lesson_id" }
      );

    if (upsertError) {
      console.error("Error upserting lesson progress:", upsertError);
      return NextResponse.json(
        { error: "Erreur lors de la mise a jour" },
        { status: 500 }
      );
    }

    // Recalculate course progress
    const { data: totalLessons } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", enrollment.course_id);

    const { data: completedLessons } = await supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", enrollmentId)
      .eq("completed", true);

    const total = totalLessons?.length ?? 0;
    const done = completedLessons?.length ?? 0;

    // Use count from headers since head: true returns empty data
    const { count: totalCount } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", enrollment.course_id);

    const { count: doneCount } = await supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", enrollmentId)
      .eq("completed", true);

    const progressPct =
      totalCount && totalCount > 0
        ? Math.round(((doneCount ?? 0) / totalCount) * 100)
        : 0;

    // Update enrollment progress
    const updateData: { progress_pct: number; completed_at?: string | null } = {
      progress_pct: progressPct,
    };

    if (progressPct === 100) {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from("enrollments")
      .update(updateData)
      .eq("id", enrollmentId);

    if (updateError) {
      console.error("Error updating enrollment progress:", updateError);
    }

    return NextResponse.json({
      progressPct,
      completedLessons: doneCount ?? 0,
      totalLessons: totalCount ?? 0,
    });
  } catch (err) {
    console.error("Progress update error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
