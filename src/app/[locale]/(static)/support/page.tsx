import { getTranslations } from "next-intl/server";
import { AmaChatbot } from "@/components/support/ama-chatbot";

export default async function SupportPage() {
  const t = await getTranslations("ama");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--ev-blue)]">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("pageSubtitle")}</p>
      </div>
      <AmaChatbot embedded />
    </div>
  );
}
