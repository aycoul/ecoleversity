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
            <Link href="/" onClick={() => onOpenChange(false)}>
              <Image src="/logo.png" alt="écoleVersity" width={180} height={48} className="h-11 w-auto" />
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
                className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[var(--ev-green-50)] hover:text-[var(--ev-blue)]"
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
            <Button className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]">
              {tc("register")}
            </Button>
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
