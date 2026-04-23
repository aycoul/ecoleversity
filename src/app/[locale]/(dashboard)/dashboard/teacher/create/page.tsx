import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Users, User, PlayCircle, ArrowLeft } from "lucide-react";

export default async function TeacherCreatePage() {
  const t = await getTranslations("teacherCreate");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "teacher") {
    redirect("/");
  }

  const options = [
    {
      href: "/dashboard/teacher/classes/new?format=group",
      icon: Users,
      title: t("liveGroup"),
      desc: t("liveGroupDesc"),
      color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      iconBg: "bg-purple-100",
    },
    {
      href: "/dashboard/teacher/classes/new?format=one_on_one",
      icon: User,
      title: t("liveOneOnOne"),
      desc: t("liveOneOnOneDesc"),
      color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
      iconBg: "bg-amber-100",
    },
    {
      href: "/dashboard/teacher/courses/new",
      icon: PlayCircle,
      title: t("videoCourse"),
      desc: t("videoCourseDesc"),
      color: "bg-[var(--ev-blue-50)] text-[var(--ev-blue)] border-[var(--ev-blue)]/20 hover:bg-[var(--ev-blue)]/10",
      iconBg: "bg-[var(--ev-blue)]/10",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/teacher"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      <p className="text-sm text-slate-500">{t("subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <Link
              key={opt.href}
              href={opt.href}
              className={`flex flex-col items-start gap-4 rounded-xl border-2 p-6 transition-all ${opt.color}`}
            >
              <div className={`rounded-lg p-3 ${opt.iconBg}`}>
                <Icon className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold">{opt.title}</h3>
                <p className="mt-1 text-xs opacity-80">{opt.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
