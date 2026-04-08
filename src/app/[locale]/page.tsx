import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Search,
  Wallet,
  Video,
  ShieldCheck,
  Smartphone,
  Banknote,
  Lock,
} from "lucide-react";

export default async function Home() {
  const t = await getTranslations("landing");

  const steps = [
    { icon: Search, titleKey: "step1Title", descKey: "step1Desc", num: 1 },
    { icon: Wallet, titleKey: "step2Title", descKey: "step2Desc", num: 2 },
    { icon: Video, titleKey: "step3Title", descKey: "step3Desc", num: 3 },
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
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register?role=parent"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-600 px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                {t("hero.ctaParent")}
              </Link>
              <Link
                href="/register?role=teacher"
                className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-emerald-600 px-8 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                {t("hero.ctaTeacher")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("howItWorks.title")}
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                  <span className="sr-only">{step.num}</span>
                  <Icon className="size-6" />
                </div>
                <span className="mt-1 text-sm font-bold text-emerald-600">
                  {step.num}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {t(`howItWorks.${step.titleKey}`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t(`howItWorks.${step.descKey}`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50/60">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("features.title")}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.titleKey}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{t(`features.${feature.titleKey}`)}</CardTitle>
                    <CardDescription>
                      {t(`features.${feature.descKey}`)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-emerald-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            {(
              [
                { value: "0+", labelKey: "teachers" },
                { value: "0+", labelKey: "students" },
                { value: "0+", labelKey: "sessions" },
              ] as const
            ).map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <p className="text-4xl font-bold text-emerald-600 sm:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-base font-medium text-slate-700">
                  {t(`stats.${stat.labelKey}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-emerald-600">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-emerald-100">
              {t("cta.subtitle")}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register?role=parent"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t("hero.ctaParent")}
              </Link>
              <Link
                href="/register?role=teacher"
                className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-white px-8 text-base font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
