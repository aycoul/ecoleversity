import { getTranslations } from "next-intl/server";
import { CouponManager } from "@/components/teacher/coupon-manager";
import { AwayModeToggle } from "@/components/teacher/away-mode-toggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CouponsPage() {
  const t = await getTranslations("coupon");
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch away mode status
  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("is_away, away_until, away_message")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("pageTitle")}</h1>
      <CouponManager />
      <AwayModeToggle
        initialIsAway={teacherProfile?.is_away ?? false}
        initialAwayUntil={teacherProfile?.away_until}
        initialAwayMessage={teacherProfile?.away_message}
      />
    </div>
  );
}
