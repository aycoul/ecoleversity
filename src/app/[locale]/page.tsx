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
  Sparkles,
  Quote,
  GraduationCap,
  Users,
  Clock,
  PlayCircle,
  PenTool,
  Star,
  BadgeCheck,
} from "lucide-react";
import { AnimateOnScroll } from "@/components/common/animate-on-scroll";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";

export const dynamic = "force-dynamic";

type FeaturedCard = {
  href: string;
  title: string;
  subtitle: string;
  image: string;
  meta: string;
  badge?: string;
};

/**
 * Per-subject illustrations for the featured section.
 * We only have 4 hand-picked images; other subjects cycle through them
 * via FEATURED_FALLBACK so cards still look visually varied even when
 * DB inventory covers many subjects.
 */
const SUBJECT_ILLUSTRATIONS: Record<string, string> = {
  francais: "/illustrations/featured-french.webp",
  mathematiques: "/illustrations/featured-maths.webp",
  maths_financieres: "/illustrations/featured-maths.webp",
  anglais: "/illustrations/featured-english.webp",
  espagnol: "/illustrations/featured-english.webp",
  allemand: "/illustrations/featured-english.webp",
  sciences: "/illustrations/featured-science.webp",
  physique_chimie: "/illustrations/featured-science.webp",
  physique_appliquee: "/illustrations/featured-science.webp",
  svt: "/illustrations/featured-science.webp",
};

const FEATURED_FALLBACK = [
  "/illustrations/featured-maths.webp",
  "/illustrations/featured-french.webp",
  "/illustrations/featured-english.webp",
  "/illustrations/featured-science.webp",
];

function imageForSubject(subject: string | null, idx: number): string {
  if (subject && SUBJECT_ILLUSTRATIONS[subject]) return SUBJECT_ILLUSTRATIONS[subject];
  return FEATURED_FALLBACK[idx % FEATURED_FALLBACK.length];
}

/**
 * Build up to 4 real "featured" cards for the home page.
 * Priority:
 *   1. Upcoming / in-progress group classes (teacher + subject + time)
 *   2. Fill remaining slots with verified teachers so the section never
 *      feels empty — bouncing visitors from the marketing page is the
 *      worst outcome.
 */
async function loadFeaturedCards(): Promise<FeaturedCard[]> {
  const admin = createAdminClient();

  const now = new Date();
  const earliestWindow = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();
  // Fetch more than we need: the end-time > now filter below runs in JS,
  // so classes already over still count against the limit. Bump to 12 and
  // slice after the filter to guarantee up to 4 truly upcoming classes.
  // Include both group and 1-to-1 classes — the marketplace shows both.
  const { data: classRows } = await admin
    .from("live_classes")
    .select(
      "id, title, subject, scheduled_at, duration_minutes, max_students, price_xof, teacher_id, format, recurrence"
    )
    .in("format", ["group", "one_on_one"])
    .eq("status", "scheduled")
    .gte("scheduled_at", earliestWindow)
    .order("scheduled_at", { ascending: true })
    .limit(12);

  const classTeacherIds = [
    ...new Set((classRows ?? []).map((c) => c.teacher_id as string)),
  ];
  const { data: classTeacherRows } =
    classTeacherIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", classTeacherIds)
      : { data: [] };
  const teacherNameById = new Map(
    (classTeacherRows ?? []).map((t) => [
      t.id as string,
      (t.display_name as string | null) ?? "Enseignant vérifié",
    ])
  );

  const nowMs = now.getTime();
  // De-duplicate by subject so featured cards showcase distinct topics
  // (a visitor sees Français + Anglais + Maths + Sciences rather than
  // four Math classes in a row). Keep the earliest class per subject.
  const seenSubjects = new Set<string>();
  const cards: FeaturedCard[] = (classRows ?? [])
    .filter((c) => {
      const start = new Date(c.scheduled_at as string).getTime();
      const end = start + (c.duration_minutes as number) * 60 * 1000;
      if (end <= nowMs) return false;
      const subj = c.subject as string;
      if (seenSubjects.has(subj)) return false;
      seenSubjects.add(subj);
      return true;
    })
    .map((c, idx) => {
      const subjectLabel =
        SUBJECT_LABELS[c.subject as Subject] ?? (c.subject as string) ?? "—";
      const teacher = teacherNameById.get(c.teacher_id as string) ?? "Enseignant";
      const price = c.price_xof as number;
      const formatLabel = c.format === "one_on_one" ? "1-à-1" : "Groupe";
      const recurrenceLabel = c.recurrence === "weekly" ? " · hebdo" : "";
      return {
        href: `/classes/${c.id}`,
        title: (c.title as string) ?? subjectLabel,
        subtitle: teacher,
        image: imageForSubject(c.subject as string | null, idx),
        meta: `${formatLabel}${recurrenceLabel} · ${c.duration_minutes} min · ${price ? `${price.toLocaleString("fr-FR")} FCFA` : "Gratuit"}`,
        badge: subjectLabel,
      };
    })
    .slice(0, 4);

  // Pad with verified teachers if we have fewer than 4 live classes.
  if (cards.length < 4) {
    const { data: teacherRows } = await admin
      .from("teacher_profiles")
      .select("id, subjects, rating_avg, rating_count")
      .eq("verification_status", "fully_verified")
      .limit(8);

    const teacherIds = (teacherRows ?? []).map((t) => t.id as string);
    const { data: profileRows } =
      teacherIds.length > 0
        ? await admin
            .from("profiles")
            .select("id, display_name, avatar_url, city")
            .in("id", teacherIds)
        : { data: [] };
    const profileById = new Map(
      (profileRows ?? []).map((p) => [p.id as string, p])
    );

    for (const tr of teacherRows ?? []) {
      if (cards.length >= 4) break;
      const prof = profileById.get(tr.id as string);
      if (!prof) continue;
      const subjects = (tr.subjects as string[] | null) ?? [];
      const firstSubject = subjects[0];
      const subjectLabel = firstSubject
        ? SUBJECT_LABELS[firstSubject as Subject] ?? firstSubject
        : "Plusieurs matières";
      const ratingCount = (tr.rating_count as number | null) ?? 0;
      const meta =
        ratingCount > 0
          ? `★ ${(tr.rating_avg as number).toFixed(1)} · ${ratingCount} avis`
          : "Enseignant vérifié";
      cards.push({
        href: `/teachers/${tr.id}`,
        title: (prof.display_name as string | null) ?? "Enseignant vérifié",
        subtitle: (prof.city as string | null) ?? "Côte d'Ivoire",
        image: imageForSubject(firstSubject ?? null, cards.length),
        meta,
        badge: subjectLabel,
      });
    }
  }

  return cards;
}

type FeaturedTeacher = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  subjects: string[];
  rating_avg: number;
  rating_count: number;
};

async function loadFeaturedTeachers(): Promise<FeaturedTeacher[]> {
  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: featured } = await admin
    .from("featured_teachers")
    .select("teacher_id")
    .eq("active", true)
    .lte("start_date", today)
    .gte("end_date", today)
    .limit(6);

  const teacherIds = (featured ?? []).map((f) => f.teacher_id as string);
  if (teacherIds.length === 0) return [];

  const { data: teachers } = await admin
    .from("teacher_profiles")
    .select("id, subjects, rating_avg, rating_count")
    .in("id", teacherIds);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url, city")
    .in("id", teacherIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return (teachers ?? []).map((t) => {
    const prof = profileById.get(t.id as string);
    return {
      id: t.id as string,
      display_name: (prof?.display_name as string | null) ?? "Enseignant",
      avatar_url: (prof?.avatar_url as string | null) ?? null,
      city: (prof?.city as string | null) ?? "Côte d'Ivoire",
      subjects: (t.subjects as string[] | null) ?? [],
      rating_avg: Number(t.rating_avg ?? 0),
      rating_count: Number(t.rating_count ?? 0),
    };
  });
}

export default async function Home() {
  const t = await getTranslations("landing");
  const featuredCards = await loadFeaturedCards();
  const featuredTeachers = await loadFeaturedTeachers();

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

  const services = [
    { icon: Video, titleKey: "liveTutoring" as const, descKey: "liveTutoringDesc" as const, src: "/illustrations/live-tutoring.webp" },
    { icon: Users, titleKey: "groupClass" as const, descKey: "groupClassDesc" as const, src: "/illustrations/group-class.webp" },
    { icon: GraduationCap, titleKey: "examPrep" as const, descKey: "examPrepDesc" as const, src: "/illustrations/exam-prep.webp" },
    { icon: Clock, titleKey: "onDemand" as const, descKey: "onDemandDesc" as const, src: "/illustrations/on-demand.webp" },
    { icon: PlayCircle, titleKey: "courses" as const, descKey: "coursesDesc" as const, src: "/illustrations/courses.webp" },
    { icon: PenTool, titleKey: "homeworkHelp" as const, descKey: "homeworkHelpDesc" as const, src: "/illustrations/homework-help.webp" },
  ];

  return (
    <>
      {/* ─── ANNOUNCEMENT BANNER ─── */}
      <div className="bg-[var(--ev-blue)] px-4 py-2.5 text-center text-sm font-medium text-white">
        <span className="mr-2">🎓</span>
        {t("banner")}
        <Link href="/register" className="ml-2 underline decoration-white/50 underline-offset-2 hover:decoration-white">
          {t("bannerCta")} →
        </Link>
      </div>

      {/* ─── SECTION 1: HERO ─── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(30,64,175,0.04),transparent)]" />
        {/* Floating gradient orbs */}
        <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-[var(--ev-blue)]/5 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-[var(--ev-amber)]/5 blur-3xl animate-float animation-delay-200" />
        <div className="pointer-events-none absolute left-1/2 bottom-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--ev-green)]/5 blur-3xl animate-float animation-delay-400" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-[var(--ev-amber)]/20 bg-[var(--ev-amber-50)] px-4 py-1.5 text-sm font-semibold text-[var(--ev-amber-dark)]">
                <Sparkles className="size-4" />
                <span>{t("badge")}</span>
              </div>

              {/* BOLD hero — accent word in different color like Outschool */}
              <h1 className="animate-fade-in-up tracking-tight">
                <span className="block text-3xl font-extrabold text-slate-800 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
                  {t("hero.titleLine1")}
                </span>
                <span className="block text-4xl font-extrabold text-[var(--ev-blue)] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
                  {t("hero.titleAccent")}
                </span>
              </h1>

              <p className="mt-5 animate-fade-in-up text-lg leading-8 text-slate-600 animation-delay-100 sm:text-xl">
                {t("hero.subtitle")}
              </p>

              {/* SEARCH BAR — like Outschool/Preply */}
              <form
                action="/teachers"
                method="GET"
                className="mt-6 animate-fade-in-up animation-delay-150"
              >
                <div className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 py-2 shadow-sm transition-all focus-within:border-[var(--ev-blue)] focus-within:shadow-md sm:px-5 sm:py-3">
                  <Search className="size-5 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    name="q"
                    placeholder={t("hero.searchPlaceholder")}
                    className="w-full bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-[var(--ev-amber)] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[var(--ev-amber-light)]"
                  >
                    {t("hero.searchButton")}
                  </button>
                </div>
              </form>

              <div className="mt-6 flex animate-fade-in-up flex-col gap-3 animation-delay-200 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/register?role=parent"
                  className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[var(--ev-amber)] px-8 text-base font-semibold text-white shadow-lg shadow-[var(--ev-amber)]/25 transition-all hover:bg-[var(--ev-amber-light)] hover:shadow-xl"
                >
                  {t("hero.ctaParent")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/register?role=teacher"
                  className="inline-flex h-13 items-center justify-center rounded-xl border-2 border-[var(--ev-blue)] px-8 text-base font-semibold text-[var(--ev-blue)] transition-all hover:bg-[var(--ev-blue-50)]"
                >
                  {t("hero.ctaTeacher")}
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500 lg:justify-start">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-[var(--ev-green)]" />
                  {t("hero.trustVerified")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Smartphone className="size-4 text-[var(--ev-green)]" />
                  {t("hero.trustPayment")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[var(--ev-amber)]" />
                  {t("hero.trustFree")}
                </span>
              </div>
            </div>

            <div className="animate-fade-in-up animation-delay-300 lg:order-last">
              <Image
                src="/illustrations/hero.webp"
                alt="Élève ivoirien suivant un cours en ligne avec un enseignant sur son téléphone"
                width={700}
                height={400}
                className="mx-auto w-full rounded-2xl shadow-2xl shadow-[var(--ev-blue)]/15 transition-shadow duration-500"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: FEATURED CLASSES (like Outschool trending) ─── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <AnimateOnScroll>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-amber)]">
                  {t("featured.sectionLabel")}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--ev-blue)] sm:text-3xl">
                  {t("featured.title")}
                </h2>
              </div>
              <Link
                href="/classes"
                className="hidden items-center gap-1 text-sm font-semibold text-[var(--ev-blue)] hover:underline sm:flex"
              >
                {t("featured.viewAll")} <ArrowRight className="size-4" />
              </Link>
            </div>
          </AnimateOnScroll>

          {featuredCards.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCards.map((card, i) => (
                <AnimateOnScroll key={i} delay={i * 80}>
                  <Link
                    href={card.href}
                    className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all hover:shadow-lg hover:shadow-[var(--ev-blue)]/5"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={card.image}
                        alt={card.title}
                        width={300}
                        height={225}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {card.badge && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--ev-blue)] shadow-sm">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span>{card.meta}</span>
                      </div>
                    </div>
                  </Link>
                </AnimateOnScroll>
              ))}
            </div>
          ) : (
            <AnimateOnScroll>
              <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-sm text-slate-600">
                  De nouveaux cours sont ajoutés chaque semaine.
                </p>
                <Link
                  href="/teachers"
                  className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--ev-blue)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--ev-blue-light)]"
                >
                  Parcourir les enseignants <ArrowRight className="size-4" />
                </Link>
              </div>
            </AnimateOnScroll>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/classes"
              className="inline-flex items-center gap-1 rounded-full bg-[var(--ev-blue-50)] px-6 py-2.5 text-sm font-semibold text-[var(--ev-blue)] hover:bg-[var(--ev-blue)]/10"
            >
              {t("featured.viewAll")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: FEATURED TEACHERS ─── */}
      {featuredTeachers.length > 0 && (
        <section className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <AnimateOnScroll>
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-amber)]">
                    Enseignants en vedette
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    Nos profs recommandés
                  </h2>
                </div>
                <Link
                  href="/teachers"
                  className="hidden items-center gap-1 text-sm font-semibold text-[var(--ev-blue)] hover:underline sm:flex"
                >
                  Tous les enseignants <ArrowRight className="size-4" />
                </Link>
              </div>
            </AnimateOnScroll>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTeachers.map((teacher, i) => {
                const firstSubject = teacher.subjects[0];
                const subjectLabel = firstSubject
                  ? SUBJECT_LABELS[firstSubject as Subject] ?? firstSubject
                  : "Plusieurs matières";
                return (
                  <AnimateOnScroll key={teacher.id} delay={i * 80}>
                    <Link
                      href={`/teachers/${teacher.id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-lg hover:shadow-[var(--ev-blue)]/5"
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {teacher.avatar_url ? (
                          <Image
                            src={teacher.avatar_url}
                            alt={teacher.display_name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
                            {teacher.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900">
                            {teacher.display_name}
                          </h3>
                          <BadgeCheck className="size-3.5 shrink-0 text-[var(--ev-blue)]" />
                        </div>
                        <p className="text-xs text-slate-500">{teacher.city}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {subjectLabel}
                          </span>
                          {teacher.rating_count > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              {teacher.rating_avg.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </AnimateOnScroll>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── SECTION 4: SERVICES ─── */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <AnimateOnScroll>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-green)]">
                {t("services.sectionLabel")}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
                {t("services.title")}
              </h2>
            </div>
          </AnimateOnScroll>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => {
              const Icon = service.icon;
              return (
                <AnimateOnScroll key={service.titleKey} delay={i * 80}>
                  <div className="group overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--ev-blue)]/8">
                    <div className="aspect-[16/9] overflow-hidden">
                      <Image
                        src={service.src}
                        alt={t(`services.${service.titleKey}`)}
                        width={400}
                        height={225}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                    <div className="p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ev-green)]/15 to-[var(--ev-green)]/5 text-[var(--ev-green)] transition-all duration-300 group-hover:from-[var(--ev-green)] group-hover:to-[var(--ev-green-light)] group-hover:text-white">
                          <Icon className="size-4" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--ev-blue)]">
                          {t(`services.${service.titleKey}`)}
                        </h3>
                      </div>
                      <p className="text-base leading-6 text-slate-600">
                        {t(`services.${service.descKey}`)}
                      </p>
                    </div>
                  </div>
                </AnimateOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: HOW IT WORKS ─── */}
      <section className="bg-white">
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

          <div className="relative mt-14">
            {/* Connecting dotted line — desktop only */}
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden sm:block">
              <div className="mx-auto w-2/3 border-t-2 border-dashed border-[var(--ev-blue)]/15" />
            </div>
            <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <AnimateOnScroll key={step.num} delay={i * 100}>
                    <div className="relative flex flex-col items-center text-center">
                      <div className="relative z-10">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--ev-blue)] text-white shadow-lg shadow-[var(--ev-blue)]/20 transition-transform duration-300 hover:scale-105">
                          <Icon className="size-7" />
                        </div>
                        <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-[var(--ev-amber)] text-xs font-bold text-white animate-pulse-soft">
                          {step.num}
                        </span>
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-[var(--ev-blue)]">
                        {t(`howItWorks.${step.titleKey}`)}
                      </h3>
                      <p className="mt-2 text-base leading-7 text-slate-600">
                        {t(`howItWorks.${step.descKey}`)}
                      </p>
                    </div>
                  </AnimateOnScroll>
                );
              })}
            </div>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <AnimateOnScroll key={feature.titleKey} delay={i * 80}>
                  <div className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--ev-blue)]/8 sm:p-6">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ev-green)]/15 to-[var(--ev-green)]/5 text-[var(--ev-green)] transition-all duration-300 group-hover:from-[var(--ev-green)] group-hover:to-[var(--ev-green-light)] group-hover:text-white">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--ev-blue)]">
                        {t(`howItWorks.${feature.titleKey}`)}
                      </h3>
                      <p className="mt-1 text-base leading-7 text-slate-600">
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

      {/* ─── SECTION 5: DREAMS ─── */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <AnimateOnScroll>
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 text-[var(--ev-amber)]">
                <Sparkles className="size-5" />
                <span className="text-sm font-semibold uppercase tracking-widest">
                  {t("dreams.sectionLabel")}
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--ev-blue)] sm:text-4xl">
                {t("dreams.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-xl text-slate-600">
                {t("dreams.subtitle")}
              </p>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="mt-10 flex justify-center">
              <Image
                src="/illustrations/futures.webp"
                alt=""
                width={800}
                height={450}
                className="w-full max-w-3xl rounded-2xl"
              />
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ─── SECTION 6: TESTIMONIALS ─── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <AnimateOnScroll>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--ev-green)]">
                {t("testimonial.sectionLabel")}
              </p>
            </div>
          </AnimateOnScroll>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <AnimateOnScroll delay={0}>
              <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
                <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-[var(--ev-green)] to-[var(--ev-green-light)]" />
                <Quote className="absolute right-6 top-6 size-8 text-[var(--ev-green)]/20" />
                <p className="text-lg leading-8 text-slate-700">
                  &ldquo;{t("testimonial.quote")}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ev-blue-50)] to-white text-sm font-bold text-[var(--ev-blue)] ring-2 ring-[var(--ev-blue)]/10">
                    KA
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--ev-blue)]">{t("testimonial.author")}</p>
                    <p className="text-xs text-slate-500">{t("testimonial.role")}</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={150}>
              <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-8">
                <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-[var(--ev-green)] to-[var(--ev-green-light)]" />
                <Quote className="absolute right-6 top-6 size-8 text-[var(--ev-green)]/20" />
                <p className="text-lg leading-8 text-slate-700">
                  &ldquo;{t("testimonial.quoteStudent")}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ev-blue-50)] to-white text-sm font-bold text-[var(--ev-blue)] ring-2 ring-[var(--ev-blue)]/10">
                    TI
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--ev-blue)]">{t("testimonial.authorStudent")}</p>
                    <p className="text-xs text-slate-500">{t("testimonial.roleStudent")}</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ─── SECTION 7: FINAL CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--ev-blue)] via-[var(--ev-blue-dark)] to-[var(--ev-blue)]">
        {/* Animated accent orbs */}
        <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[var(--ev-amber)]/10 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-white/5 blur-3xl animate-float animation-delay-300" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <AnimateOnScroll>
              <div className="flex justify-center lg:order-first">
                <Image
                  src="/illustrations/graduation.webp"
                  alt="Diplôme de réussite scolaire"
                  width={400}
                  height={225}
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
                  className="mb-6 h-12 w-auto rounded-lg bg-white/95 px-3 py-1.5"
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
                    className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[var(--ev-amber)] px-8 text-base font-semibold text-white shadow-lg shadow-black/20 transition-all hover:bg-[var(--ev-amber-light)] hover:shadow-xl"
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
