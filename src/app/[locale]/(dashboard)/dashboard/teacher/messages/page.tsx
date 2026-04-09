import { getTranslations } from "next-intl/server";
import { Inbox } from "@/components/messaging/inbox";

export default async function TeacherMessagesPage() {
  const t = await getTranslations("messaging");

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{t("title")}</h1>
      <Inbox />
    </div>
  );
}
