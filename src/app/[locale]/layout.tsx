import type { Metadata, Viewport } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AppChrome } from "@/components/layout/app-chrome";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/common/sw-register";
import { PwaInstallPrompt } from "@/components/common/pwa-install-prompt";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import "../globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "écoleVersity — Le meilleur maître de maison en ligne",
  description:
    "Trouvez un enseignant qualifié pour votre enfant. Cours particuliers, cours de groupe, préparation aux examens — où que vous soyez en Côte d'Ivoire.",
};

export const viewport: Viewport = {
  themeColor: "#1E40AF",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  // Resolve current user for the top nav (hides Log in/Sign up when authed)
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let navUser:
    | { id: string; displayName: string; role: UserRole }
    | null = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", authUser.id)
      .maybeSingle();
    navUser = {
      id: authUser.id,
      displayName:
        (profile?.display_name as string | null) ??
        authUser.email ??
        "Utilisateur",
      role: ((profile?.role as UserRole | null) ?? "parent") as UserRole,
    };
  }

  return (
    <html
      lang={locale}
      className={`${nunito.variable} ${nunitoSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="écoleVersity" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-[var(--ev-blue)] focus:px-4 focus:py-2 focus:text-white"
          >
            Aller au contenu principal
          </a>
          <AppChrome user={navUser}>{children}</AppChrome>
          <Toaster position="top-center" richColors />
          <ServiceWorkerRegister />
          <PwaInstallPrompt />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
