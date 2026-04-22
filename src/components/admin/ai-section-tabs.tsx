"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Shared tab strip rendered at the top of every "IA" admin page
 * (Services, Jumeaux, Paramètres, Agents). The sidebar already groups
 * these together, but once you're inside the group a tab strip is the
 * fastest way to jump between siblings without your cursor leaving the
 * content area.
 */

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/dashboard/admin/ai-services", label: "Services" },
  { href: "/dashboard/admin/ai-twins", label: "Jumeaux" },
  { href: "/dashboard/admin/ai-settings", label: "Paramètres" },
  { href: "/dashboard/admin/agents", label: "Agents" },
];

export function AiSectionTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections IA"
      className="mb-6 flex flex-wrap gap-1 border-b border-slate-200"
    >
      {TABS.map((t) => {
        // Matches either the locale-prefixed path or the raw one; using
        // endsWith keeps the check locale-agnostic.
        const isActive =
          pathname === t.href ||
          pathname.endsWith(t.href) ||
          pathname.includes(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative -mb-px rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border border-slate-200 border-b-white bg-white text-[var(--ev-blue)]"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
