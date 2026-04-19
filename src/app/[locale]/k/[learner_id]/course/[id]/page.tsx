import { redirect } from "next/navigation";

export default async function KidCourseRedirect({
  params,
}: {
  params: Promise<{ learner_id: string; id: string }>;
}) {
  const { learner_id, id } = await params;
  // Middleware has already verified the parent owns learner_id.
  // Reuse the existing player; learner_id passes through as a query arg
  // so the player can attribute progress to this learner when that wiring
  // is added in Phase B.
  redirect(`/course/${id}?k=${learner_id}`);
}
