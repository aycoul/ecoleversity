"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { Menu } from "lucide-react";
import Image from "next/image";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("navigation");
  const tc = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="écoleVersity"
            width={180}
            height={46}
            className="h-10 w-auto sm:h-11"
            priority
          />
        </Link>

        {/* Desktop nav — clean 4 items */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href="/teachers"
            className="rounded-lg px-4 py-2 text-[15px] font-semibold text-slate-700 transition-all hover:bg-[var(--ev-blue-50)] hover:text-[var(--ev-blue)]"
          >
            {t("findTeacher")}
          </Link>
          <Link
            href="/courses"
            className="rounded-lg px-4 py-2 text-[15px] font-semibold text-slate-700 transition-all hover:bg-[var(--ev-blue-50)] hover:text-[var(--ev-blue)]"
          >
            {t("ourCourses")}
          </Link>
          <Link
            href="/exams"
            className="rounded-lg px-4 py-2 text-[15px] font-semibold text-slate-700 transition-all hover:bg-[var(--ev-blue-50)] hover:text-[var(--ev-blue)]"
          >
            {t("examPrep")}
          </Link>
          <Link
            href="/register?role=teacher"
            className="rounded-lg px-4 py-2 text-[15px] font-semibold text-[var(--ev-green-dark)] transition-all hover:bg-[var(--ev-green-50)]"
          >
            {t("teach")}
          </Link>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-[15px] font-semibold text-slate-600 hover:text-[var(--ev-blue)]"
            >
              {tc("login")}
            </Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-full bg-[var(--ev-amber)] px-6 text-[15px] font-bold text-white shadow-md shadow-[var(--ev-amber)]/20 hover:bg-[var(--ev-amber-light)] hover:shadow-lg">
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

        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
      </div>
    </header>
  );
}
