"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
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
  GraduationCap,
  LogOut,
  Video,
  Receipt,
  Banknote,
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
};

export function DashboardShell({
  links,
  role,
  userName,
  avatarUrl,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <GraduationCap className="size-6 text-emerald-600" />
          <span className="text-lg font-bold text-emerald-600">EcoleVersity</span>
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
                        ? "bg-emerald-100 text-emerald-700"
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
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 truncate text-sm font-medium text-slate-700">
              {userName}
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-md p-1 text-slate-400 hover:text-slate-600"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
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
                      ? "text-emerald-600"
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
