import { SessionPageContent } from "@/components/session/session-page-content";

export const dynamic = "force-dynamic";

/**
 * Kid-mode session room. Renders the same content as /session/[id] but
 * sits under the kid route tree so the kid layout's sidebar stays
 * visible — the child never loses their navigation while in class.
 * The kid layout already provides a "Retour en mode parent" button,
 * so we suppress the internal back bar.
 */
export default async function KidClassRoomPage({
  params,
}: {
  params: Promise<{ learner_id: string; id: string }>;
}) {
  const { learner_id, id } = await params;
  return (
    <SessionPageContent
      sessionId={id}
      hideBackBar
      backHref={`/k/${learner_id}`}
    />
  );
}
