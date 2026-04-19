"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import Image from "next/image";
import type { UserRole } from "@/types/domain";

type HeaderProps = {
  user: {
    id: string;
    displayName: string;
    role: UserRole;
  } | null;
};

function dashboardHref(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin/verification";
    case "teacher":
      return "/dashboard/teacher";
    case "school_admin":
      return "/dashboard/admin/verification";
    case "parent":
    default:
      return "/dashboard/parent/overview";
  }
}

export function Header({ user = null }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("navigation");
  const tc = useTranslations("common");
  const initial = (user?.displayName?.[0] ?? "?").toUpperCase();

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

        {/* Desktop actions — conditional on auth state */}
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link href={dashboardHref(user.role)}>
                <Button
                  variant="ghost"
                  className="gap-2 text-[15px] font-semibold text-slate-700 hover:text-[var(--ev-blue)]"
                >
                  <LayoutDashboard className="size-4" />
                  {tc("mySpace")}
                </Button>
              </Link>
              <Link href={dashboardHref(user.role)} className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--ev-blue)] text-sm font-bold text-white">
                  {initial}
                </div>
              </Link>
              {/* Plain <a> for full-page nav — ensures root layout re-fetches with cleared auth */}
              <a href="/logout">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-slate-700"
                  aria-label={tc("logout")}
                  title={tc("logout")}
                >
                  <LogOut className="size-4" />
                </Button>
              </a>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="size-6" />
        </button>

        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} user={user} />
      </div>
    </header>
  );
}
