"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { UserRole } from "@/types/domain";
import { AvatarSwitcher, type AvatarSwitcherLearner } from "@/components/nav/avatar-switcher";
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
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: string;
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
};

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
  const userInitial = userName.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 md:flex md:flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <Image src="/logo.png" alt="écoleVersity" width={180} height={48} className="h-11 w-auto" />
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {links.map((link) => {
              const Icon = iconMap[link.icon] ?? User;
              const isActive = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--ev-green)]/10 text-[var(--ev-blue)]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 px-4 py-3">
          <AvatarSwitcher
            userName={userName}
            userInitial={userInitial}
            activeLearnerId={activeLearnerId}
            learners={learners}
            isParent={role === "parent"}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-white p-4 md:p-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <ul className="flex items-center justify-around">
          {links.slice(0, 5).map((link) => {
            const Icon = iconMap[link.icon] ?? User;
            const isActive = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-2 text-[0.65rem]",
                    isActive
                      ? "text-[var(--ev-blue)]"
                      : "text-slate-400"
                  )}
                >
                  <Icon className="size-5" />
                  <span className="truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
