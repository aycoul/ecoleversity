import { getTranslations } from "next-intl/server";
import { Scale } from "lucide-react";

export default async function TermsPage() {
  const t = await getTranslations("terms");

  const sections = [
    "acceptance",
    "services",
    "accounts",
    "payments",
    "refunds",
    "teachers",
    "conduct",
    "children",
    "content",
    "contact",
    "termination",
    "liability",
    "modifications",
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--ev-blue-50)]">
          <Scale className="size-7 text-[var(--ev-blue)]" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--ev-blue)]">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("lastUpdated")}</p>
      </div>

      <div className="prose prose-slate max-w-none">
        {sections.map((section) => (
          <section key={section} className="mb-8">
            <h2 className="text-xl font-bold text-[var(--ev-blue)]">{t(`${section}.title`)}</h2>
            <p className="mt-2 text-base leading-7 text-slate-700 whitespace-pre-line">{t(`${section}.text`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
