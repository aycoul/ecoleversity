import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
  Search,
  Wallet,
  Video,
  ShieldCheck,
  Smartphone,
  Banknote,
  Lock,
  Star,
  Users,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default async function Home() {
  const t = await getTranslations("landing");

  const steps = [
    { icon: Search, titleKey: "step1Title", descKey: "step1Desc", num: "01" },
    { icon: Wallet, titleKey: "step2Title", descKey: "step2Desc", num: "02" },
    { icon: Video, titleKey: "step3Title", descKey: "step3Desc", num: "03" },
  ] as const;

  const features = [
    { icon: ShieldCheck, titleKey: "verified", descKey: "verifiedDesc" },
    { icon: Smartphone, titleKey: "mobile", descKey: "mobileDesc" },
    { icon: Banknote, titleKey: "payment", descKey: "paymentDesc" },
    { icon: Lock, titleKey: "safe", descKey: "safeDesc" },
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(43,48,144,0.06),transparent)]" />
        <div className="absolute right-0 top-0 -z-0 h-96 w-96 rounded-full bg-[var(--ev-green)]/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 -z-0 h-72 w-72 rounded-full bg-[var(--ev-blue)]/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-24">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] px-4 py-1.5 text-sm font-medium text-[var(--ev-green-dark)]">
              <CheckCircle2 className="size-4" />
              <span>Plateforme #1 de tutorat en Côte d&apos;Ivoire</span>
            </div>

            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-[var(--ev-blue)] sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {t("hero.subtitle")}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register?role=parent"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[var(--ev-blue)] px-8 text-base font-semibold text-white shadow-lg shadow-[var(--ev-blue)]/25 transition-all hover:bg-[var(--ev-blue-light)] hover:shadow-xl hover:shadow-[var(--ev-blue)]/30"
              >
                {t("hero.ctaParent")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/register?role=teacher"
                className="inline-flex h-13 items-center justify-center rounded-xl border-2 border-[var(--ev-green)] px-8 text-base font-semibold text-[var(--ev-green-dark)] transition-all hover:bg-[var(--ev-green-50)]"
              >
                {t("hero.ctaTeacher")}
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-[var(--ev-green)]" />
                Enseignants vérifiés
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="size-4 text-[var(--ev-green)]" />
                Orange Money & Wave
              </span>
              <span className="flex items-center gap-1.5">
                <Video className="size-4 text-[var(--ev-green)]" />
                Cours en direct
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[var(--ev-blue-50)]/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-green)]">
              Simple & rapide
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
              {t("howItWorks.title")}
            </h2>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--ev-blue)] text-white shadow-lg shadow-[var(--ev-blue)]/20">
                      <Icon className="size-7" />
                    </div>
                    <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-[var(--ev-green)] text-xs font-bold text-white">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-[var(--ev-blue)]">
                    {t(`howItWorks.${step.titleKey}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(`howItWorks.${step.descKey}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-green)]">
              Pourquoi écoleVersity
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
              {t("features.title")}
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-[var(--ev-blue)]/10 hover:shadow-lg hover:shadow-[var(--ev-blue)]/5 sm:p-8"
                >
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--ev-green)]/10 text-[var(--ev-green)] transition-colors group-hover:bg-[var(--ev-green)] group-hover:text-white">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--ev-blue)]">
                    {t(`features.${feature.titleKey}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(`features.${feature.descKey}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[var(--ev-blue)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            {(
              [
                { icon: Users, value: "0+", labelKey: "teachers" },
                { icon: BookOpen, value: "0+", labelKey: "students" },
                { icon: Star, value: "0+", labelKey: "sessions" },
              ] as const
            ).map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.labelKey} className="text-center">
                  <Icon className="mx-auto mb-3 size-8 text-[var(--ev-green)]" />
                  <p className="text-4xl font-extrabold text-white sm:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-base font-medium text-blue-200">
                    {t(`stats.${stat.labelKey}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-[var(--ev-blue)] via-[var(--ev-blue-dark)] to-[var(--ev-blue)]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="écoleVersity"
              width={200}
              height={50}
              className="mb-8 h-12 w-auto brightness-0 invert"
            />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-blue-200">
              {t("cta.subtitle")}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register?role=parent"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[var(--ev-green)] px-8 text-base font-semibold text-white shadow-lg shadow-black/20 transition-all hover:bg-[var(--ev-green-light)] hover:shadow-xl"
              >
                {t("hero.ctaParent")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/register?role=teacher"
                className="inline-flex h-13 items-center justify-center rounded-xl border-2 border-white/30 px-8 text-base font-semibold text-white transition-all hover:border-white/60 hover:bg-white/10"
              >
                {t("hero.ctaTeacher")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
