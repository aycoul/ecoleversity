import { redirect } from "next/navigation";

export default async function KidLessonRedirect({
  params,
}: {
  params: Promise<{ learner_id: string; id: string; lessonId: string }>;
}) {
  const { learner_id, id, lessonId } = await params;
  redirect(`/course/${id}/lesson/${lessonId}?k=${learner_id}`);
}
