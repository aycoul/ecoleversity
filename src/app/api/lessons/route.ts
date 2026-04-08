import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const createLessonSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
  videoUrl: z.string().url().optional(),
  videoDurationSeconds: z.number().int().min(0).default(0),
  pdfAttachmentUrl: z.string().url().optional(),
  isPreview: z.boolean().default(false),
  sortOrder: z.number().int().min(0).optional(),
});

const updateLessonSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  videoUrl: z.string().url().nullable().optional(),
  videoDurationSeconds: z.number().int().min(0).optional(),
  pdfAttachmentUrl: z.string().url().nullable().optional(),
  isPreview: z.boolean().optional(),
});

const deleteLessonSchema = z.object({
  lessonId: z.string().uuid(),
});

async function verifyTeacherOwnsCourse(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  courseId: string,
  userId: string
) {
  const { data } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", userId)
    .single();
  return !!data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { courseId, title, videoUrl, videoDurationSeconds, pdfAttachmentUrl, isPreview, sortOrder } =
      parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    if (!(await verifyTeacherOwnsCourse(supabase, courseId, user.id))) {
      return NextResponse.json({ error: "Cours non trouve" }, { status: 404 });
    }

    // Determine sort_order: if not provided, put at end
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const { data: existingLessons } = await supabase
        .from("lessons")
        .select("sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: false })
        .limit(1);

      finalSortOrder = existingLessons && existingLessons.length > 0
        ? existingLessons[0].sort_order + 1
        : 0;
    }

    const { data: lesson, error: insertError } = await supabase
      .from("lessons")
      .insert({
        course_id: courseId,
        title,
        video_url: videoUrl ?? null,
        video_duration_seconds: videoDurationSeconds,
        pdf_attachment_url: pdfAttachmentUrl ?? null,
        is_preview: isPreview,
        sort_order: finalSortOrder,
      })
      .select("*")
      .single();

    if (insertError || !lesson) {
      console.error("Error creating lesson:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de la creation de la lecon" },
        { status: 500 }
      );
    }

    // Update total_duration_minutes on the course
    await updateCourseDuration(supabase, courseId);

    return NextResponse.json({ lesson });
  } catch (err) {
    console.error("Lesson creation error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, title, videoUrl, videoDurationSeconds, pdfAttachmentUrl, isPreview } =
      parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Get lesson to find course_id
    const { data: existingLesson } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();

    if (!existingLesson) {
      return NextResponse.json({ error: "Lecon non trouvee" }, { status: 404 });
    }

    if (!(await verifyTeacherOwnsCourse(supabase, existingLesson.course_id, user.id))) {
      return NextResponse.json({ error: "Cours non trouve" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (videoUrl !== undefined) updateData.video_url = videoUrl;
    if (videoDurationSeconds !== undefined) updateData.video_duration_seconds = videoDurationSeconds;
    if (pdfAttachmentUrl !== undefined) updateData.pdf_attachment_url = pdfAttachmentUrl;
    if (isPreview !== undefined) updateData.is_preview = isPreview;

    const { data: lesson, error: updateError } = await supabase
      .from("lessons")
      .update(updateData)
      .eq("id", lessonId)
      .select("*")
      .single();

    if (updateError || !lesson) {
      console.error("Error updating lesson:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise a jour" },
        { status: 500 }
      );
    }

    await updateCourseDuration(supabase, existingLesson.course_id);

    return NextResponse.json({ lesson });
  } catch (err) {
    console.error("Lesson update error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deleteLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lessonId } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { data: existingLesson } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();

    if (!existingLesson) {
      return NextResponse.json({ error: "Lecon non trouvee" }, { status: 404 });
    }

    if (!(await verifyTeacherOwnsCourse(supabase, existingLesson.course_id, user.id))) {
      return NextResponse.json({ error: "Cours non trouve" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (deleteError) {
      console.error("Error deleting lesson:", deleteError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    await updateCourseDuration(supabase, existingLesson.course_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lesson delete error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

async function updateCourseDuration(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  courseId: string
) {
  const { data: lessons } = await supabase
    .from("lessons")
    .select("video_duration_seconds")
    .eq("course_id", courseId);

  const totalSeconds = (lessons ?? []).reduce(
    (sum, l) => sum + (l.video_duration_seconds ?? 0),
    0
  );

  await supabase
    .from("courses")
    .update({ total_duration_minutes: Math.ceil(totalSeconds / 60) })
    .eq("id", courseId);
}
