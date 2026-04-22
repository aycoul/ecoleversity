import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformConfigRow } from "@/components/admin/platform-config-row";
import { TeacherTwinPolicyRow } from "@/components/admin/teacher-twin-policy-row";
import { AiSectionTabs } from "@/components/admin/ai-section-tabs";

type ConfigRow = {
  key: string;
  value: unknown;
  label_fr: string;
  description_fr: string | null;
};

type TeacherRow = {
  id: string;
  display_name: string | null;
  email: string;
  twin_tier: "none" | "qa" | "full";
  twin_voice_consent_at: string | null;
  twin_full_session_consent_at: string | null;
  twin_price_ratio: number | null;
};

/**
 * Admin control panel for the AI twin product.
 *
 * Two sections:
 *   1. Global platform config — revenue shares + default pricing ratio.
 *   2. Per-teacher twin policy — tier, consents, price override.
 *
 * All edits are admin-only and land immediately in the database. The feature
 * remains hidden from teachers/parents/learners until TWIN_PUBLIC_ACCESS flips.
 */
export default async function AiSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: config } = await admin
    .from("platform_config")
    .select("key, value, label_fr, description_fr")
    .order("key", { ascending: true })
    .returns<ConfigRow[]>();

  const { data: teachers } = await admin
    .from("profiles")
    .select(
      "id, display_name, twin_tier, twin_voice_consent_at, twin_full_session_consent_at, twin_price_ratio"
    )
    .eq("role", "teacher")
    .order("display_name", { ascending: true });

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }
  const teacherRows: TeacherRow[] = (teachers ?? []).map((t) => ({
    id: t.id as string,
    display_name: (t.display_name as string) ?? null,
    email: emailById.get(t.id as string) ?? "—",
    twin_tier: ((t.twin_tier as string) ?? "none") as TeacherRow["twin_tier"],
    twin_voice_consent_at: (t.twin_voice_consent_at as string) ?? null,
    twin_full_session_consent_at: (t.twin_full_session_consent_at as string) ?? null,
    twin_price_ratio:
      t.twin_price_ratio === null || t.twin_price_ratio === undefined
        ? null
        : Number(t.twin_price_ratio),
  }));

  return (
    <div className="space-y-10">
      <AiSectionTabs />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres IA</h1>
        <p className="mt-1 text-sm text-slate-600">
          Contrôle des parts de revenus, du tarif des séances IA, et de la
          politique du jumeau par enseignant. Tout est modifiable à chaud.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Parts de revenus et tarification
        </h2>
        <div className="space-y-2">
          {(config ?? []).map((c) => (
            <PlatformConfigRow
              key={c.key}
              configKey={c.key}
              label={c.label_fr}
              description={c.description_fr}
              initialValue={c.value}
            />
          ))}
          {(!config || config.length === 0) && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Aucune configuration — appliquez la migration 00026.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Politique jumeau par enseignant
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Enseignant</th>
                <th className="p-3 text-left font-semibold text-slate-700">Email</th>
                <th className="p-3 text-left font-semibold text-slate-700">Politique</th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="p-3 align-top">{t.display_name ?? "—"}</td>
                  <td className="p-3 align-top text-slate-500">{t.email}</td>
                  <td className="p-3">
                    <TeacherTwinPolicyRow
                      teacherId={t.id}
                      initialTier={t.twin_tier}
                      initialVoiceConsent={t.twin_voice_consent_at}
                      initialFullConsent={t.twin_full_session_consent_at}
                      initialPriceRatio={t.twin_price_ratio}
                    />
                  </td>
                </tr>
              ))}
              {teacherRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-sm text-slate-500">
                    Aucun enseignant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
