import { SessionPageContent } from "@/components/session/session-page-content";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  return <SessionPageContent sessionId={id} />;
}
