"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { GraduationCap, Menu } from "lucide-react";

const navLinks = [
  { href: "/", key: "home" },
  { href: "/teachers", key: "teachers" },
  { href: "/courses", key: "courses" },
  { href: "/classes", key: "classes" },
  { href: "/help", key: "help" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("navigation");
  const tc = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="size-7 text-emerald-600" />
          <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-xl font-bold text-transparent">
            {tc("appName")}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <LocaleSwitcher />
          <Link href="/login">
            <Button variant="ghost" className="text-slate-700">
              {tc("login")}
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              {tc("register")}
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="size-6" />
        </button>

        {/* Mobile nav sheet */}
        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
      </div>
    </header>
  );
}
