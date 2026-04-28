import { SessionPageContent } from "@/components/session/session-page-content";

export const dynamic = "force-dynamic";

/**
 * Kid-mode session room. Same backing component as /session/[id], but
 * SessionPageContent enters fullscreen-overlay mode when hideBackBar is
 * true — covering the kid dashboard chrome (sidebar, banner, avatar
 * switcher) so the LiveKit room and whiteboard get the entire viewport.
 * Without that, the sidebar steals ~225px and the whiteboard toolbar
 * overflows past the right edge on tablet and phone. Navigation back
 * to kid mode happens via the in-room "Quitter le cours" button.
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
      actingAsLearnerId={learner_id}
    />
  );
}
