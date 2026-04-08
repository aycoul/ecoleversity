"use client";

import { GraduationCap } from "lucide-react";
import { Link } from "@/i18n/routing";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center bg-gradient-to-b from-emerald-50/50 to-white px-4 py-8">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <GraduationCap className="size-8 text-emerald-600" />
        <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-2xl font-bold text-transparent">
          EcoleVersity
        </span>
      </Link>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
