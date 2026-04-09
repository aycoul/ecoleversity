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
  Sparkles,
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

  const futures = [
    { src: "/illustrations/future-doctor.png", label: "Médecin" },
    { src: "/illustrations/future-engineer.png", label: "Ingénieure" },
    { src: "/illustrations/future-entrepreneur.png", label: "Entrepreneur" },
  ] as const;

  return (
    <>
      {/* Hero — with illustration */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(43,48,144,0.06),transparent)]" />
        <div className="absolute right-0 top-0 -z-0 h-96 w-96 rounded-full bg-[var(--ev-green)]/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Text */}
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] px-4 py-1.5 text-sm font-medium text-[var(--ev-green-dark)]">
                <CheckCircle2 className="size-4" />
                <span>Plateforme #1 de tutorat en Côte d&apos;Ivoire</span>
              </div>

              <h1 className="animate-fade-in-up text-4xl font-extrabold tracking-tight text-[var(--ev-blue)] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                {t("hero.title")}
              </h1>

              <p className="mt-5 animate-fade-in-up text-lg leading-8 text-slate-600 animation-delay-100 sm:text-xl">
                {t("hero.subtitle")}
              </p>

              <div className="mt-8 flex animate-fade-in-up flex-col gap-3 animation-delay-200 sm:flex-row sm:justify-center lg:justify-start">
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

              <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500 lg:justify-start">
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

            {/* Hero illustration */}
            <div className="animate-fade-in-up animation-delay-300 lg:order-last">
              <Image
                src="/illustrations/hero-kids.png"
                alt="Enfants ivoiriens apprenant en ligne avec leur enseignant"
                width={600}
                height={450}
                className="mx-auto w-full max-w-lg rounded-2xl lg:max-w-none"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — with parent-child image */}
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

          {/* Parent-child illustration */}
          <div className="mt-14 flex justify-center">
            <Image
              src="/illustrations/parent-child.png"
              alt="Mère ivoirienne et sa fille découvrant écoleVersity"
              width={500}
              height={375}
              className="w-full max-w-md rounded-2xl shadow-lg shadow-[var(--ev-blue)]/10"
            />
          </div>
        </div>
      </section>

      {/* Dreams — "Ils peuvent tout devenir" */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-[var(--ev-green)]">
              <Sparkles className="size-5" />
              <span className="text-sm font-semibold uppercase tracking-widest">
                L&apos;avenir commence ici
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
              Ils peuvent tout devenir
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Chaque enfant a un potentiel immense. Avec les bons enseignants, il n&apos;y a pas de limites.
            </p>
          </div>

          {/* Dreams group illustration */}
          <div className="mt-10 flex justify-center">
            <Image
              src="/illustrations/dreams.png"
              alt="Enfants ivoiriens rêvant de leurs futures carrières — médecin, ingénieur, enseignant, pilote, scientifique"
              width={800}
              height={400}
              className="w-full max-w-3xl rounded-2xl"
            />
          </div>

          {/* Future transformations */}
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {futures.map((future) => (
              <div
                key={future.label}
                className="group overflow-hidden rounded-2xl border border-slate-100 transition-all hover:border-[var(--ev-blue)]/10 hover:shadow-lg hover:shadow-[var(--ev-blue)]/5"
              >
                <div className="overflow-hidden">
                  <Image
                    src={future.src}
                    alt={future.label}
                    width={500}
                    height={280}
                    className="w-full transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm font-bold text-[var(--ev-blue)]">
                    Aujourd&apos;hui élève → Demain {future.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[var(--ev-blue-50)]/30">
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

      {/* Final CTA — with graduation + mascot */}
      <section className="bg-gradient-to-br from-[var(--ev-blue)] via-[var(--ev-blue-dark)] to-[var(--ev-blue)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex justify-center lg:order-first">
              <Image
                src="/illustrations/graduation.png"
                alt="Diplômée ivoirienne avec ses parents fiers"
                width={400}
                height={400}
                className="w-full max-w-xs rounded-2xl"
              />
            </div>
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <Image
                src="/logo.png"
                alt="écoleVersity"
                width={180}
                height={45}
                className="mb-6 h-10 w-auto brightness-0 invert"
              />
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("cta.title")}
              </h2>
              <p className="mt-4 max-w-xl text-lg text-blue-200">
                {t("cta.subtitle")}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
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
        </div>
      </section>
    </>
  );
}
