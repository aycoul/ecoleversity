import { SessionPageContent } from "@/components/session/session-page-content";

export const dynamic = "force-dynamic";

/**
 * Parent-scoped session page. Renders the same content as /session/[id]
 * but lives under (dashboard)/, so the DashboardShell sidebar stays
 * visible while the parent is in class — they never lose navigation
 * (same pattern as /k/[learner_id]/class/[id]/room for kid mode).
 * Shell already provides a "Mon espace" avatar + sidebar, so the
 * internal back bar is suppressed.
 */
export default async function ParentSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SessionPageContent
      sessionId={id}
      hideBackBar
      backHref="/dashboard/parent/overview"
    />
  );
}
