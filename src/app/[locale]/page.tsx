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
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Quote,
} from "lucide-react";
import { AnimateOnScroll } from "@/components/common/animate-on-scroll";

export default async function Home() {
  const t = await getTranslations("landing");

  const steps = [
    { icon: Search, titleKey: "step1Title" as const, descKey: "step1Desc" as const, num: "01" },
    { icon: Wallet, titleKey: "step2Title" as const, descKey: "step2Desc" as const, num: "02" },
    { icon: Video, titleKey: "step3Title" as const, descKey: "step3Desc" as const, num: "03" },
  ];

  const features = [
    { icon: ShieldCheck, titleKey: "verified" as const, descKey: "verifiedDesc" as const },
    { icon: Smartphone, titleKey: "mobile" as const, descKey: "mobileDesc" as const },
    { icon: Banknote, titleKey: "payment" as const, descKey: "paymentDesc" as const },
    { icon: Lock, titleKey: "safe" as const, descKey: "safeDesc" as const },
  ];

  const futures = [
    { src: "/illustrations/future-doctor.webp", labelKey: "futureDoctor" as const },
    { src: "/illustrations/future-engineer.webp", labelKey: "futureEngineer" as const },
    { src: "/illustrations/future-entrepreneur.webp", labelKey: "futureEntrepreneur" as const },
  ];

  return (
    <>
      {/* ─── SECTION 1: HERO ─── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(43,48,144,0.06),transparent)]" />
        <div className="absolute right-0 top-0 -z-0 h-96 w-96 rounded-full bg-[var(--ev-green)]/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-[var(--ev-green)]/20 bg-[var(--ev-green-50)] px-4 py-1.5 text-sm font-medium text-[var(--ev-green-dark)]">
                <CheckCircle2 className="size-4" />
                <span>{t("badge")}</span>
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
                  {t("hero.trustVerified")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Smartphone className="size-4 text-[var(--ev-green)]" />
                  {t("hero.trustPayment")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Video className="size-4 text-[var(--ev-green)]" />
                  {t("hero.trustLive")}
                </span>
              </div>
            </div>

            <div className="animate-fade-in-up animation-delay-300 lg:order-last">
              <Image
                src="/illustrations/hero-kids.webp"
                alt=""
                width={600}
                height={450}
                className="mx-auto w-full max-w-lg rounded-2xl lg:max-w-none"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: HOW IT WORKS + FEATURES (MERGED) ─── */}
      <section className="bg-[var(--ev-blue-50)]/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <AnimateOnScroll>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-green)]">
                {t("howItWorks.sectionLabel")}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
                {t("howItWorks.title")}
              </h2>
            </div>
          </AnimateOnScroll>

          {/* 3 Steps */}
          <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <AnimateOnScroll key={step.num} delay={i * 100}>
                  <div className="flex flex-col items-center text-center">
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
                </AnimateOnScroll>
              );
            })}
          </div>

          {/* Parent-child illustration bridge */}
          <AnimateOnScroll>
            <div className="mt-16 flex justify-center">
              <Image
                src="/illustrations/parent-child.webp"
                alt=""
                width={480}
                height={360}
                className="w-full max-w-sm rounded-2xl shadow-lg shadow-[var(--ev-blue)]/10"
              />
            </div>
          </AnimateOnScroll>

          {/* 4 Feature cards — CI-specific */}
          <div className="mt-16 grid gap-5 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <AnimateOnScroll key={feature.titleKey} delay={i * 80}>
                  <div className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-[var(--ev-blue)]/10 hover:shadow-lg hover:shadow-[var(--ev-blue)]/5 sm:p-6">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-green)]/10 text-[var(--ev-green)] transition-colors group-hover:bg-[var(--ev-green)] group-hover:text-white">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--ev-blue)]">
                        {t(`howItWorks.${feature.titleKey}`)}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {t(`howItWorks.${feature.descKey}`)}
                      </p>
                    </div>
                  </div>
                </AnimateOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: DREAMS ─── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <AnimateOnScroll>
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 text-[var(--ev-green)]">
                <Sparkles className="size-5" />
                <span className="text-sm font-semibold uppercase tracking-widest">
                  {t("dreams.sectionLabel")}
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
                {t("dreams.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                {t("dreams.subtitle")}
              </p>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="mt-10 flex justify-center">
              <Image
                src="/illustrations/dreams.webp"
                alt=""
                width={800}
                height={400}
                className="w-full max-w-3xl rounded-2xl"
              />
            </div>
          </AnimateOnScroll>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {futures.map((future, i) => (
              <AnimateOnScroll key={future.labelKey} delay={i * 100}>
                <div className="group overflow-hidden rounded-2xl border border-slate-100 transition-all hover:border-[var(--ev-blue)]/10 hover:shadow-lg hover:shadow-[var(--ev-blue)]/5">
                  <div className="overflow-hidden">
                    <Image
                      src={future.src}
                      alt=""
                      width={500}
                      height={280}
                      className="w-full transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-sm font-bold text-[var(--ev-blue)]">
                      {t("dreams.todayStudent")} → {t(`dreams.${future.labelKey}`)}
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: TESTIMONIALS ─── */}
      <section className="bg-[var(--ev-blue-50)]/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <AnimateOnScroll>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-green)]">
                {t("testimonial.sectionLabel")}
              </p>
            </div>
          </AnimateOnScroll>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {/* Teacher testimonial */}
            <AnimateOnScroll delay={0}>
              <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <Quote className="absolute right-6 top-6 size-8 text-[var(--ev-green)]/20" />
                <p className="text-base leading-7 text-slate-700">
                  &ldquo;{t("testimonial.quote")}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Image
                    src="/illustrations/teacher.webp"
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-[var(--ev-blue)]">
                      {t("testimonial.author")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("testimonial.role")}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Parent testimonial */}
            <AnimateOnScroll delay={150}>
              <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <Quote className="absolute right-6 top-6 size-8 text-[var(--ev-green)]/20" />
                <p className="text-base leading-7 text-slate-700">
                  &ldquo;{t("testimonial.quoteStudent")}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Image
                    src="/illustrations/parent-child.webp"
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-[var(--ev-blue)]">
                      {t("testimonial.authorStudent")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("testimonial.roleStudent")}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: FINAL CTA ─── */}
      <section className="bg-gradient-to-br from-[var(--ev-blue)] via-[var(--ev-blue-dark)] to-[var(--ev-blue)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <AnimateOnScroll>
              <div className="flex justify-center lg:order-first">
                <Image
                  src="/illustrations/graduation.webp"
                  alt=""
                  width={400}
                  height={400}
                  className="w-full max-w-xs rounded-2xl"
                />
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={100}>
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
            </AnimateOnScroll>
          </div>
        </div>
      </section>
    </>
  );
}
