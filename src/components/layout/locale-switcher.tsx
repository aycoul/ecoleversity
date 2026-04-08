"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: "fr" | "en") {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5">
      <button
        onClick={() => switchLocale("fr")}
        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
          locale === "fr"
            ? "bg-emerald-600 text-white"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => switchLocale("en")}
        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
          locale === "en"
            ? "bg-emerald-600 text-white"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        EN
      </button>
    </div>
  );
}
