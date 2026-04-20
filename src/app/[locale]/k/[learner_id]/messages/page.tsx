import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Inbox } from "@/components/messaging/inbox";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ learner_id: string }>;
};

/**
 * Kid-mode messages. Same Inbox component as the parent view, but
 * scoped to the active learner via the learnerId filter — so the kid
 * only sees their own conversations with their teachers, never sibling
 * threads or unrelated parent↔teacher admin chats.
 *
 * Messages themselves still go through the moderated /api/messages
 * endpoint with PII block-and-log, and the full transcript is visible
 * to the parent on /dashboard/parent/messages.
 */
export default async function KidMessagesPage({ params }: PageProps) {
  const { learner_id } = await params;
  const t = await getTranslations("messaging");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Defense-in-depth: make sure this learner belongs to the signed-in
  // parent. The layout already guards but the page might be linked
  // from elsewhere.
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id, first_name")
    .eq("id", learner_id)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (!learner) redirect("/dashboard/parent/overview");

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mb-4 text-sm text-slate-500">
        Messages de {learner.first_name} avec ses enseignants
      </p>
      <Inbox learnerId={learner_id} />
    </div>
  );
}
