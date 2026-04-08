import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateCourseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  subject: z.string().min(1).optional(),
  gradeLevel: z.string().min(1).optional(),
  examType: z.string().nullable().optional(),
  language: z.string().optional(),
  priceXof: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
});

async function getTeacherCourse(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, courseId: string, userId: string) {
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("teacher_id", userId)
    .single();
  return course;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await request.json();
    const parsed = updateCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const existingCourse = await getTeacherCourse(supabase, courseId, user.id);
    if (!existingCourse) {
      return NextResponse.json({ error: "Cours non trouve" }, { status: 404 });
    }

    const { title, description, subject, gradeLevel, examType, language, priceXof, status, thumbnailUrl } =
      parsed.data;

    // If publishing, check at least 1 lesson with video
    if (status === "published") {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, video_url")
        .eq("course_id", courseId);

      const hasVideoLesson = (lessons ?? []).some((l) => l.video_url);
      if (!hasVideoLesson) {
        return NextResponse.json(
          { error: "Ajoutez au moins une lecon avec video avant de publier" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (gradeLevel !== undefined) updateData.grade_level = gradeLevel;
    if (examType !== undefined) updateData.exam_type = examType;
    if (language !== undefined) updateData.language = language;
    if (priceXof !== undefined) updateData.price_xof = priceXof;
    if (status !== undefined) updateData.status = status;
    if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;

    const { data: course, error: updateError } = await supabase
      .from("courses")
      .update(updateData)
      .eq("id", courseId)
      .select("id, title, status")
      .single();

    if (updateError || !course) {
      console.error("Error updating course:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise a jour" },
        { status: 500 }
      );
    }

    return NextResponse.json({ course });
  } catch (err) {
    console.error("Course update error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const existingCourse = await getTeacherCourse(supabase, courseId, user.id);
    if (!existingCourse) {
      return NextResponse.json({ error: "Cours non trouve" }, { status: 404 });
    }

    // Lessons are cascade-deleted by FK
    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (deleteError) {
      console.error("Error deleting course:", deleteError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Course delete error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
