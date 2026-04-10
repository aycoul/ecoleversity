import { getTranslations } from "next-intl/server";
import { ExamHub } from "@/components/exam/exam-hub";
import { GraduationCap } from "lucide-react";

export default async function ExamsPage() {
  const t = await getTranslations("exam");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[var(--ev-blue-50)]">
          <GraduationCap className="size-7 text-[var(--ev-blue)]" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--ev-blue)]">{t("hubTitle")}</h1>
        <p className="mt-2 text-slate-600">{t("hubSubtitle")}</p>
      </div>
      <ExamHub />
    </div>
  );
}
