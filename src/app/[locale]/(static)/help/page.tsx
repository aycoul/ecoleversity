import { getTranslations } from "next-intl/server";
import { HelpArticleList } from "@/components/support/help-article-list";
import { Link } from "@/i18n/routing";
import { HelpCircle, MessageCircle } from "lucide-react";

export default async function HelpPage() {
  const t = await getTranslations("help");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <HelpCircle className="mx-auto mb-3 size-10 text-[var(--ev-blue)]" />
        <h1 className="text-3xl font-bold text-[var(--ev-blue)]">{t("title")}</h1>
        <p className="mt-2 text-slate-600">{t("subtitle")}</p>
      </div>

      <HelpArticleList />

      <div className="mt-10 rounded-xl border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] p-6 text-center">
        <MessageCircle className="mx-auto mb-2 size-8 text-[var(--ev-green)]" />
        <p className="text-sm font-medium text-slate-800">{t("needMoreHelp")}</p>
        <Link
          href="/support"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--ev-blue)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--ev-blue-light)]"
        >
          {t("talkToAma")}
        </Link>
      </div>
    </div>
  );
}
