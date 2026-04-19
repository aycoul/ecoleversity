import { redirect } from "next/navigation";

export default async function KidClassRoomRedirect({
  params,
}: {
  params: Promise<{ learner_id: string; id: string }>;
}) {
  const { learner_id, id } = await params;
  // Reuse the existing live session room; learner_id passes through
  // for Phase B attribution (session logs, moderation labels).
  redirect(`/session/${id}?k=${learner_id}`);
}
