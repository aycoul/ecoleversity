"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe } from "lucide-react";

type LocaleSwitcherProps = {
  variant?: "header" | "footer";
};

export function LocaleSwitcher({ variant = "header" }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: "fr" | "en") {
    router.replace(pathname, { locale: newLocale });
  }

  const isFooter = variant === "footer";

  return (
    <div className={`flex items-center gap-2 ${isFooter ? "" : ""}`}>
      <Globe className={`size-4 ${isFooter ? "text-slate-400" : "text-slate-400"}`} />
      <div className={`flex items-center gap-0.5 rounded-full p-0.5 ${isFooter ? "border border-white/20" : "border border-slate-200"}`}>
        <button
          onClick={() => switchLocale("fr")}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            locale === "fr"
              ? isFooter ? "bg-white/20 text-white" : "bg-[var(--ev-blue)] text-white"
              : isFooter ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          FR
        </button>
        <button
          onClick={() => switchLocale("en")}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            locale === "en"
              ? isFooter ? "bg-white/20 text-white" : "bg-[var(--ev-blue)] text-white"
              : isFooter ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
