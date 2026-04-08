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
import { GraduationCap } from "lucide-react";

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const navLinks = [
  { href: "/", key: "home" },
  { href: "/teachers", key: "teachers" },
  { href: "/courses", key: "courses" },
  { href: "/classes", key: "classes" },
  { href: "/help", key: "help" },
] as const;

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const t = useTranslations("navigation");
  const tc = useTranslations("common");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader className="pb-0">
          <SheetTitle>
            <Link
              href="/"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2"
            >
              <GraduationCap className="size-6 text-emerald-600" />
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-lg font-bold text-transparent">
                {tc("appName")}
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <Separator />

        <nav className="flex flex-1 flex-col gap-1 px-4">
          {navLinks.map((link) => (
            <SheetClose key={link.key} render={<div />}>
              <Link
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                {t(link.key)}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <Separator />

        <SheetFooter className="gap-3">
          <div className="flex justify-center">
            <LocaleSwitcher />
          </div>
          <Link href="/login" onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full">
              {tc("login")}
            </Button>
          </Link>
          <Link href="/register" onClick={() => onOpenChange(false)}>
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
              {tc("register")}
            </Button>
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
