import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";

export default async function TeacherDashboardPage() {
  const t = await getTranslations("dashboard.sidebar");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <GraduationCap className="mb-4 size-16 text-slate-300" />
      <h1 className="text-2xl font-bold text-slate-900">
        {t("dashboard")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {t("comingSoon")}
      </p>
    </div>
  );
}
