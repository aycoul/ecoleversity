import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
  Heart,
  GraduationCap,
  Shield,
  Globe,
  Users,
  Sparkles,
  Video,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-16 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[var(--ev-amber)]/10">
          <Heart className="size-8 text-[var(--ev-amber)]" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--ev-blue)]">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {t("subtitle")}
        </p>
      </div>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="mb-4 text-2xl font-bold text-[var(--ev-blue)]">{t("missionTitle")}</h2>
        <p className="text-lg leading-8 text-slate-700">{t("missionText")}</p>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-[var(--ev-blue)]">{t("howTitle")}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Users, titleKey: "howTeachers", descKey: "howTeachersDesc" },
            { icon: Video, titleKey: "howLive", descKey: "howLiveDesc" },
            { icon: BookOpen, titleKey: "howCourses", descKey: "howCoursesDesc" },
          ].map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="rounded-2xl border border-slate-100 bg-white p-6">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-[var(--ev-blue-50)]">
                <Icon className="size-6 text-[var(--ev-blue)]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t(titleKey)}</h3>
              <p className="mt-2 text-base text-slate-600">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-[var(--ev-blue)]">{t("valuesTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Shield, titleKey: "valueSafety", descKey: "valueSafetyDesc" },
            { icon: GraduationCap, titleKey: "valueExcellence", descKey: "valueExcellenceDesc" },
            { icon: Globe, titleKey: "valueAccess", descKey: "valueAccessDesc" },
            { icon: Sparkles, titleKey: "valueInnovation", descKey: "valueInnovationDesc" },
          ].map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="flex items-start gap-4 rounded-xl border border-slate-100 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ev-green)]/10">
                <Icon className="size-5 text-[var(--ev-green)]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t(titleKey)}</h3>
                <p className="mt-1 text-sm text-slate-600">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl bg-[var(--ev-blue-50)] p-8 text-center">
        <h2 className="text-2xl font-bold text-[var(--ev-blue)]">{t("contactTitle")}</h2>
        <p className="mt-2 text-base text-slate-600">{t("contactText")}</p>
        <p className="mt-4 text-lg font-semibold text-[var(--ev-blue)]">info@ecoleversity.com</p>
        <Link
          href="/support"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--ev-amber)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--ev-amber-light)]"
        >
          {t("contactCta")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
