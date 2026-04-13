"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LocaleSwitcher } from "./locale-switcher";
import Image from "next/image";
import { Search, BookOpen, GraduationCap, Zap, HelpCircle } from "lucide-react";

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const navLinks = [
  { href: "/teachers", key: "findTeacher", icon: Search },
  { href: "/courses", key: "ourCourses", icon: BookOpen },
  { href: "/exams", key: "examPrep", icon: GraduationCap },
  { href: "/register?role=teacher", key: "teach", icon: Zap, accent: true },
  { href: "/help", key: "help", icon: HelpCircle },
] as const;

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const t = useTranslations("navigation");
  const tc = useTranslations("common");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader className="pb-0">
          <SheetTitle>
            <Link href="/" onClick={() => onOpenChange(false)}>
              <Image src="/logo.png" alt="écoleVersity" width={180} height={48} className="h-11 w-auto" />
            </Link>
          </SheetTitle>
        </SheetHeader>

        <Separator />

        <nav className="flex flex-1 flex-col gap-1 px-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <SheetClose key={link.key} render={<div />}>
                <Link
                  href={link.href}
                  onClick={() => onOpenChange(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold transition-colors ${
                    "accent" in link && link.accent
                      ? "text-[var(--ev-green-dark)] hover:bg-[var(--ev-green-50)]"
                      : "text-slate-700 hover:bg-[var(--ev-blue-50)] hover:text-[var(--ev-blue)]"
                  }`}
                >
                  <Icon className="size-5 opacity-60" />
                  {t(link.key)}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <Separator />

        <SheetFooter className="gap-3">
          <div className="flex justify-center">
            <LocaleSwitcher />
          </div>
          <Link href="/login" onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full text-base font-semibold">
              {tc("login")}
            </Button>
          </Link>
          <Link href="/register" onClick={() => onOpenChange(false)}>
            <Button className="w-full rounded-full bg-[var(--ev-amber)] text-base font-bold text-white hover:bg-[var(--ev-amber-light)]">
              {tc("register")}
            </Button>
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
