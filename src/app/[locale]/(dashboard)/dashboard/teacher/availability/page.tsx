import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AvailabilityGrid } from "@/components/teacher/availability-grid";
import { Calendar } from "lucide-react";

export default async function TeacherAvailabilityPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("teacher");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch existing availability slots
  const { data: slots } = await supabase
    .from("teacher_availability")
    .select("id, day_of_week, start_time, end_time")
    .eq("teacher_id", user.id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="size-6 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {t("availability")}
          </h1>
          <p className="text-sm text-slate-500">{t("setAvailability")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <AvailabilityGrid
          teacherId={user.id}
          initialSlots={
            slots?.map((s) => ({
              id: s.id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
            })) ?? []
          }
        />
      </div>
    </div>
  );
}
