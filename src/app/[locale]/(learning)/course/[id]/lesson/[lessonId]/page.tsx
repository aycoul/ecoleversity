import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CoursePlayer } from "@/components/course/course-player";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, teacher_id, status")
    .eq("id", courseId)
    .single();

  if (!course) {
    notFound();
  }

  // Fetch all lessons for this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, title, video_url, video_duration_seconds, pdf_attachment_url, sort_order, is_preview"
    )
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (!lessons || lessons.length === 0) {
    notFound();
  }

  // Find the current lesson
  const currentLesson = lessons.find((l) => l.id === lessonId);
  if (!currentLesson) {
    notFound();
  }

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If lesson is preview, allow access without enrollment
  if (currentLesson.is_preview) {
    return (
      <CoursePlayer
        courseId={courseId}
        courseTitle={course.title}
        lessons={lessons.map((l) => ({ ...l, description: null }))}
        currentLesson={{ ...currentLesson, description: null }}
        enrollmentId={null}
        initialCompletedLessonIds={[]}
        initialProgressPct={0}
      />
    );
  }

  // Non-preview lessons require enrollment
  if (!user) {
    redirect("/login");
  }

  // Get parent's learners
  const { data: learners } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("parent_id", user.id);

  if (!learners || learners.length === 0) {
    redirect(`/courses/${courseId}`);
  }

  const learnerIds = learners.map((l) => l.id);

  // Check enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, progress_pct")
    .eq("course_id", courseId)
    .in("learner_id", learnerIds)
    .limit(1)
    .maybeSingle();

  if (!enrollment) {
    // Not enrolled, redirect to course detail page
    redirect(`/courses/${courseId}`);
  }

  // Fetch lesson progress for this enrollment
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("enrollment_id", enrollment.id);

  const completedLessonIds = (progressData ?? [])
    .filter((p) => p.completed)
    .map((p) => p.lesson_id);

  return (
    <CoursePlayer
      courseId={courseId}
      courseTitle={course.title}
      lessons={lessons.map((l) => ({ ...l, description: null }))}
      currentLesson={{ ...currentLesson, description: null }}
      enrollmentId={enrollment.id}
      initialCompletedLessonIds={completedLessonIds}
      initialProgressPct={enrollment.progress_pct ?? 0}
    />
  );
}
