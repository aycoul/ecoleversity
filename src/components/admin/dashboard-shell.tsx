"use client";

import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { UserRole } from "@/types/domain";
import { AvatarSwitcher, type AvatarSwitcherLearner } from "@/components/nav/avatar-switcher";
import { SwitchToParentButton } from "@/components/nav/switch-to-parent-button";
import { useLogout } from "@/hooks/use-logout";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ShieldCheck,
  Ticket,
  BarChart3,
  User,
  BookOpen,
  Calendar,
  Wallet,
  MessageCircle,
  Users,
  Video,
  Receipt,
  Banknote,
  Settings,
  PlayCircle,
  LayoutDashboard,
  Flag,
  AlertOctagon,
  Cpu,
  TrendingUp,
  Award,
  Search,
  Menu,
  LogOut,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Bookmark,
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: string;
  /** Number shown as a red badge next to the label. Hidden when 0 / undefined. */
  badge?: number;
  /**
   * Section header to render before this link. Consecutive links sharing
   * the same section are grouped visually; undefined/null means the link
   * sits outside any group (rendered above the first section).
   */
  section?: string;
};

type DashboardShellProps = {
  links: NavLink[];
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  activeLearnerId?: string | null;
  learners?: AvatarSwitcherLearner[];
  children: React.ReactNode;
};

const iconMap: Record<string, React.ElementType> = {
  "shield-check": ShieldCheck,
  ticket: Ticket,
  "bar-chart": BarChart3,
  user: User,
  "book-open": BookOpen,
  calendar: Calendar,
  wallet: Wallet,
  "message-circle": MessageCircle,
  users: Users,
  video: Video,
  receipt: Receipt,
  banknote: Banknote,
  settings: Settings,
  "play-circle": PlayCircle,
  "layout-dashboard": LayoutDashboard,
  flag: Flag,
  "alert-octagon": AlertOctagon,
  cpu: Cpu,
  "trending-up": TrendingUp,
  award: Award,
  search: Search,
  sparkles: Sparkles,
  "rotate-ccw": RotateCcw,
  bookmark: Bookmark,
};

// Pages where a Back button makes no sense (user is already "home" for their role).
const ROOT_DASHBOARD_PATHS = new Set([
  "/dashboard/parent",
  "/dashboard/parent/overview",
  "/dashboard/teacher",
  "/dashboard/admin",
  "/dashboard/admin/verification",
]);

// Emoji per role — the subtitle text comes from i18n at render time so it
// switches with the user's selected locale.
const ROLE_EMOJI: Record<UserRole | "kid", string> = {
  teacher: "👨‍🏫",
  parent: "👋",
  admin: "👋",
  school_admin: "🏫",
  kid: "🎒",
};
const ROLE_SUBTITLE_KEY: Record<UserRole | "kid", string> = {
  teacher: "teacherSubtitle",
  parent: "parentSubtitle",
  admin: "adminSubtitle",
  school_admin: "schoolAdminSubtitle",
  kid: "kidSubtitle",
};

function GreetingBanner({
  userName,
  role,
  activeLearnerId,
  learners,
}: {
  userName: string;
  role: UserRole;
  activeLearnerId: string | null;
  learners: AvatarSwitcherLearner[];
}) {
  const t = useTranslations("dashboard.greeting");
  const firstName = userName.split(" ")[0];
  const isKidMode = role === "parent" && !!activeLearnerId;
  const activeLearner = isKidMode
    ? learners.find((l) => l.id === activeLearnerId)
    : null;
  const displayName = activeLearner?.first_name ?? firstName;
  const greetingRole = isKidMode ? "kid" : role;
  const emoji = ROLE_EMOJI[greetingRole] ?? ROLE_EMOJI.parent;
  const subtitleKey = ROLE_SUBTITLE_KEY[greetingRole] ?? ROLE_SUBTITLE_KEY.parent;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-[var(--ev-blue)] via-[var(--ev-blue)] to-[var(--ev-blue-light)] p-5 text-white md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl">
            {t("hello")} {displayName} {emoji}
          </h1>
          <p className="mt-1 text-sm text-white/80">{t(subtitleKey)}</p>
        </div>
        {role === "admin" && (
          <Sparkles className="size-5 shrink-0 text-white/60" />
        )}
      </div>
    </section>
  );
}

export function DashboardShell({
  links,
  role,
  userName,
  avatarUrl,
  activeLearnerId = null,
  learners = [],
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const userInitial = userName.charAt(0).toUpperCase() || "?";
  const [moreOpen, setMoreOpen] = useState(false);
  const logout = useLogout();

  // Hide the Back button on role-root pages; everywhere else it helps users
  // escape deep sub-sections that don't always have an in-page "back" link.
  const showBack = !ROOT_DASHBOARD_PATHS.has(pathname);

  const hasOverflow = links.length > 5;
  const primaryLinks = hasOverflow ? links.slice(0, 4) : links.slice(0, 5);
  const overflowLinks = hasOverflow ? links.slice(4) : [];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 md:flex md:flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <Link href="/" aria-label="Retour à l'accueil écoleVersity" className="inline-block">
            <Image src="/logo.png" alt="écoleVersity" width={180} height={48} className="h-11 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map((link, i) => {
              const Icon = iconMap[link.icon] ?? User;
              // startsWith on "/" would match everything, so anchor overview
              // links (typically ending in "/dashboard/{role}" or root) with
              // an exact comparison as a fallback.
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              const prevSection = i > 0 ? links[i - 1].section : undefined;
              const showHeader =
                link.section && link.section !== prevSection;
              return (
                <li key={link.href}>
                  {showHeader && (
                    <div
                      className={cn(
                        "px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400",
                        i === 0 ? "pb-1" : "pb-1 pt-4"
                      )}
                    >
                      {link.section}
                    </div>
                  )}
                  <Link
                    href={link.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-[var(--ev-blue)]/8 text-[var(--ev-blue)] font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--ev-blue)]" />
                    )}
                    <Icon className="size-4" />
                    <span className="flex-1">{link.label}</span>
                    {!!link.badge && link.badge > 0 && (
                      <span
                        aria-label={`${link.badge} en attente`}
                        className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[0.65rem] font-bold text-white"
                      >
                        {link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* In kid mode, surface a one-tap exit at the bottom of the sidebar. */}
        {activeLearnerId && (
          <div className="border-t border-slate-200 px-3 pt-3">
            <SwitchToParentButton />
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-white p-4 pb-24 md:p-8">
        {/* Top bar: back button on the left, avatar on the right. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
              aria-label="Retour"
            >
              <ArrowLeft className="size-4" />
              <span>Retour</span>
            </button>
          ) : (
            <span />
          )}
          <AvatarSwitcher
            userName={userName}
            userInitial={userInitial}
            activeLearnerId={activeLearnerId}
            learners={learners}
            isParent={role === "parent"}
            role={role}
            dropdownPosition="top"
          />
        </div>

        {/* Persistent identity banner — visible on every dashboard page */}
        <div className="mb-6">
          <GreetingBanner
            userName={userName}
            role={role}
            activeLearnerId={activeLearnerId}
            learners={learners}
          />
        </div>

        {/* Mobile-only kid-mode banner — the sidebar switch button
            is hidden on phones, so surface the exit here too. */}
        {activeLearnerId && (
          <div className="mb-4 md:hidden">
            <SwitchToParentButton />
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex items-center justify-around">
          {primaryLinks.map((link) => {
            const Icon = iconMap[link.icon] ?? User;
            const isActive = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[0.65rem] transition-all duration-200",
                    isActive
                      ? "text-[var(--ev-blue)] font-semibold"
                      : "text-slate-400"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-x-3 -top-px h-0.5 rounded-b-full bg-[var(--ev-blue)]" />
                  )}
                  <div className="relative">
                    <Icon className="size-5" />
                    {!!link.badge && link.badge > 0 && (
                      <span
                        aria-label={`${link.badge} en attente`}
                        className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.55rem] font-bold text-white"
                      >
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <span className="truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
          {hasOverflow && (
            <li>
              <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger
                  render={
                    <button
                      type="button"
                      className="relative flex flex-col items-center gap-0.5 px-3 py-2 text-[0.65rem] text-slate-400"
                      aria-label="Plus d'options"
                    >
                      <Menu className="size-5" />
                      <span className="truncate">Plus</span>
                    </button>
                  }
                />
                <SheetContent side="bottom" className="pb-8">
                  <SheetHeader>
                    <SheetTitle className="text-left text-[var(--ev-blue)]">Navigation</SheetTitle>
                  </SheetHeader>
                  <ul className="mt-4 space-y-1">
                    {overflowLinks.map((link) => {
                      const Icon = iconMap[link.icon] ?? User;
                      const isActive = pathname.startsWith(link.href);
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-[var(--ev-green)]/10 text-[var(--ev-blue)]"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="size-5" />
                            <span className="flex-1">{link.label}</span>
                            {!!link.badge && link.badge > 0 && (
                              <span
                                aria-label={`${link.badge} en attente`}
                                className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[0.65rem] font-bold text-white"
                              >
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="size-5" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
