"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
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
};

const NAV_ITEMS: CommandItemData[] = [
  { label: "Accueil", href: "/", icon: Home, keywords: ["home", "landing"] },
  { label: "Tableau de bord parent", href: "/dashboard/parent/overview", icon: LayoutDashboard, keywords: ["dashboard", "parent", "overview"] },
  { label: "Mes enfants", href: "/dashboard/parent/children", icon: Users, keywords: ["children", "kids", "enfants"] },
  { label: "Mes cours", href: "/dashboard/parent/courses", icon: BookOpen, keywords: ["courses", "cours"] },
  { label: "Mes sessions", href: "/dashboard/parent/sessions", icon: Calendar, keywords: ["sessions", "classes", "rendez-vous"] },
  { label: "Messages", href: "/dashboard/parent/messages", icon: MessageCircle, keywords: ["messages", "chat"] },
  { label: "Portefeuille", href: "/dashboard/parent/wallet", icon: Wallet, keywords: ["wallet", "paiement", "argent"] },
  { label: "Tableau de bord enseignant", href: "/dashboard/teacher", icon: LayoutDashboard, keywords: ["dashboard", "teacher", "enseignant"] },
  { label: "Mes classes (enseignant)", href: "/dashboard/teacher/classes", icon: Video, keywords: ["classes", "teacher", "sessions"] },
  { label: "Gains", href: "/dashboard/teacher/earnings", icon: Wallet, keywords: ["earnings", "gains", "argent"] },
  { label: "Catalogue des enseignants", href: "/teachers", icon: Users, keywords: ["teachers", "enseignants", "catalogue"] },
  { label: "Catalogue des cours", href: "/courses", icon: BookOpen, keywords: ["courses", "cours", "catalogue"] },
  { label: "Classes en groupe", href: "/classes", icon: Video, keywords: ["classes", "groupe", "live"] },
  { label: "Préparation aux examens", href: "/exams", icon: GraduationCap, keywords: ["exams", "examens", "bac", "bepc"] },
  { label: "Aide", href: "/help", icon: HelpCircle, keywords: ["help", "aide", "support"] },
  { label: "Paramètres", href: "/dashboard/settings/notifications", icon: Settings, keywords: ["settings", "paramètres"] },
  { label: "Déconnexion", href: "/logout", icon: LogOut, keywords: ["logout", "déconnexion", "quitter"] },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

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
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une page, un cours, un enseignant…" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords.join(" ")}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Icon className="mr-2 size-4 text-slate-500" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Recherche rapide">
            <CommandItem
              value="search teachers enseignants"
              onSelect={() => {
                setOpen(false);
                router.push("/teachers");
              }}
            >
              <Search className="mr-2 size-4 text-slate-500" />
              <span>Rechercher un enseignant…</span>
            </CommandItem>
            <CommandItem
              value="search courses cours"
              onSelect={() => {
                setOpen(false);
                router.push("/courses");
              }}
            >
              <Search className="mr-2 size-4 text-slate-500" />
              <span>Rechercher un cours…</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
