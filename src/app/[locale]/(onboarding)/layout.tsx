"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gradient-to-b from-[var(--ev-blue-50)] to-white px-4 py-8">
      <Link href="/" className="mb-8">
        <Image
          src="/logo.png"
          alt="écoleVersity"
          width={180}
          height={45}
          className="h-11 w-auto"
        />
      </Link>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
