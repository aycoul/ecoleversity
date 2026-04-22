"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/use-logout";
import type { UserRole } from "@/types/domain";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Command,
} from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  LayoutDashboard,
  BookOpen,
  Users,
  Video,
  GraduationCap,
  HelpCircle,
  Settings,
  MessageCircle,
  LogOut,
  Wallet,
  Calendar,
  Award,
  Home,
} from "lucide-react";

type CommandItemData = {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords: string[];
  action?: "logout";
  requiresAuth?: boolean;
  roles?: UserRole[];
};

const PUBLIC_ITEMS: CommandItemData[] = [
  { label: "Accueil", href: "/", icon: Home, keywords: ["home", "landing"] },
  { label: "Catalogue des enseignants", href: "/teachers", icon: Users, keywords: ["teachers", "enseignants", "catalogue"] },
  { label: "Catalogue des cours", href: "/courses", icon: BookOpen, keywords: ["courses", "cours", "catalogue"] },
  { label: "Classes en groupe", href: "/classes", icon: Video, keywords: ["classes", "groupe", "live"] },
  { label: "Préparation aux examens", href: "/exams", icon: GraduationCap, keywords: ["exams", "examens", "bac", "bepc"] },
  { label: "Aide", href: "/help", icon: HelpCircle, keywords: ["help", "aide", "support"] },
];

const AUTH_ITEMS: CommandItemData[] = [
  { label: "Tableau de bord parent", href: "/dashboard/parent/overview", icon: LayoutDashboard, keywords: ["dashboard", "parent", "overview"], roles: ["parent"] },
  { label: "Mes enfants", href: "/dashboard/parent/children", icon: Users, keywords: ["children", "kids", "enfants"], roles: ["parent"] },
  { label: "Mes cours", href: "/dashboard/parent/courses", icon: BookOpen, keywords: ["courses", "cours"], roles: ["parent"] },
  { label: "Mes sessions", href: "/dashboard/parent/sessions", icon: Calendar, keywords: ["sessions", "classes", "rendez-vous"], roles: ["parent"] },
  { label: "Messages", href: "/dashboard/parent/messages", icon: MessageCircle, keywords: ["messages", "chat"] },
  { label: "Portefeuille", href: "/dashboard/parent/wallet", icon: Wallet, keywords: ["wallet", "paiement", "argent"], roles: ["parent"] },
  { label: "Tableau de bord enseignant", href: "/dashboard/teacher", icon: LayoutDashboard, keywords: ["dashboard", "teacher", "enseignant"], roles: ["teacher"] },
  { label: "Mes classes (enseignant)", href: "/dashboard/teacher/classes", icon: Video, keywords: ["classes", "teacher", "sessions"], roles: ["teacher"] },
  { label: "Gains", href: "/dashboard/teacher/earnings", icon: Wallet, keywords: ["earnings", "gains", "argent"], roles: ["teacher"] },
  { label: "Paramètres", href: "/dashboard/settings/notifications", icon: Settings, keywords: ["settings", "paramètres"] },
  { label: "Déconnexion", href: "/logout", icon: LogOut, keywords: ["logout", "déconnexion", "quitter"], action: "logout" },
];

export function CommandMenu({ user }: { user?: { role: UserRole } | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const logout = useLogout();

  const shortcut = useMemo(() => {
    if (typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform)) {
      return "⌘K";
    }
    return "Ctrl+K";
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (item: CommandItemData) => {
      setOpen(false);
      if (item.action === "logout") {
        logout();
      } else {
        router.push(item.href);
      }
    },
    [router, logout]
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure dialog is mounted before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-700 transition-colors"
        aria-label="Rechercher"
      >
        <Search className="size-4" />
        <span className="text-xs">Rechercher…</span>
        <kbd className="ml-2 hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 lg:inline">
          {shortcut}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-lg">
          <DialogTitle className="sr-only">Rechercher</DialogTitle>
          <Command
            filter={(value, search) => {
              const normalizedValue = value.toLowerCase();
              const normalizedSearch = search.toLowerCase();
              if (normalizedValue.includes(normalizedSearch)) return 1;
              return 0;
            }}
          >
            <CommandInput
              ref={inputRef}
              placeholder="Rechercher une page, un cours, un enseignant…"
              className="h-12 border-0 border-b border-slate-200 px-4 text-base outline-none focus:ring-0"
            />
            <CommandList className="max-h-[60vh] overflow-y-auto py-2">
              <CommandEmpty className="px-4 py-6 text-center text-sm text-slate-500">
                Aucun résultat trouvé.
              </CommandEmpty>
              <CommandGroup heading="Navigation" className="px-2">
                {(user ? [...PUBLIC_ITEMS, ...AUTH_ITEMS.filter((i) => !i.roles || i.roles.includes(user.role))] : PUBLIC_ITEMS).map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`${item.label} ${item.keywords.join(" ")}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 aria-selected:bg-[var(--ev-blue)]/10 aria-selected:text-[var(--ev-blue)]"
                    >
                      <Icon className="size-4 text-slate-500" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator className="my-2 h-px bg-slate-100" />
              <CommandGroup heading="Recherche rapide" className="px-2">
                <CommandItem
                  value="search teachers enseignants"
                  onSelect={() => {
                    setOpen(false);
                    router.push("/teachers");
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 aria-selected:bg-[var(--ev-blue)]/10 aria-selected:text-[var(--ev-blue)]"
                >
                  <Search className="size-4 text-slate-500" />
                  <span>Rechercher un enseignant…</span>
                </CommandItem>
                <CommandItem
                  value="search courses cours"
                  onSelect={() => {
                    setOpen(false);
                    router.push("/courses");
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 aria-selected:bg-[var(--ev-blue)]/10 aria-selected:text-[var(--ev-blue)]"
                >
                  <Search className="size-4 text-slate-500" />
                  <span>Rechercher un cours…</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
