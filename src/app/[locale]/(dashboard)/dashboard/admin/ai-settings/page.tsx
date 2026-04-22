import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformConfigRow } from "@/components/admin/platform-config-row";
import { TeacherTwinPolicyRow } from "@/components/admin/teacher-twin-policy-row";
import { AiServicesToggle } from "@/components/admin/ai-services-toggle";
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
  ai_services_enabled: boolean;
};

type ParentRow = {
  id: string;
  display_name: string | null;
  email: string;
  ai_services_enabled: boolean;
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
      "id, display_name, twin_tier, twin_voice_consent_at, twin_full_session_consent_at, twin_price_ratio, ai_services_enabled"
    )
    .eq("role", "teacher")
    .order("display_name", { ascending: true });

  const { data: parents } = await admin
    .from("profiles")
    .select("id, display_name, ai_services_enabled")
    .eq("role", "parent")
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
    ai_services_enabled: Boolean(t.ai_services_enabled),
  }));
  const parentRows: ParentRow[] = (parents ?? []).map((p) => ({
    id: p.id as string,
    display_name: (p.display_name as string) ?? null,
    email: emailById.get(p.id as string) ?? "—",
    ai_services_enabled: Boolean(p.ai_services_enabled),
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
          Enseignants
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          &quot;Transcription&quot; active la capture automatique des cours (résumés + données du jumeau).
          &quot;Politique&quot; fixe le tier du jumeau (aucun / Q&amp;R / complet), les consentements et la
          surcharge de tarif.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Enseignant</th>
                <th className="p-3 text-left font-semibold text-slate-700">Email</th>
                <th className="p-3 text-center font-semibold text-slate-700">Transcription</th>
                <th className="p-3 text-left font-semibold text-slate-700">Politique jumeau</th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="p-3 align-top">{t.display_name ?? "—"}</td>
                  <td className="p-3 align-top text-slate-500">{t.email}</td>
                  <td className="p-3 text-center align-top">
                    <AiServicesToggle
                      userId={t.id}
                      initialEnabled={t.ai_services_enabled}
                    />
                  </td>
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
                  <td colSpan={4} className="p-4 text-center text-sm text-slate-500">
                    Aucun enseignant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Parents
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Active l&apos;envoi des résumés de cours par email après chaque séance de l&apos;enfant.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Parent</th>
                <th className="p-3 text-left font-semibold text-slate-700">Email</th>
                <th className="p-3 text-right font-semibold text-slate-700">Résumés email</th>
              </tr>
            </thead>
            <tbody>
              {parentRows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="p-3">{p.display_name ?? "—"}</td>
                  <td className="p-3 text-slate-500">{p.email}</td>
                  <td className="p-3 text-right">
                    <AiServicesToggle
                      userId={p.id}
                      initialEnabled={p.ai_services_enabled}
                    />
                  </td>
                </tr>
              ))}
              {parentRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-sm text-slate-500">
                    Aucun parent.
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
