import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiServicesToggle } from "@/components/admin/ai-services-toggle";
import { AiSectionTabs } from "@/components/admin/ai-section-tabs";

type UserRow = {
  id: string;
  role: string;
  display_name: string | null;
  ai_services_enabled: boolean;
  email: string;
};

/**
 * Admin page to opt accounts in/out of the AI transcript/summary pipeline.
 * Teachers here = "their sessions get transcribed + twin-trained".
 * Parents here = "they receive session summary emails".
 * Both default OFF — admin flips per account.
 */
export default async function AiServicesPage() {
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
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, display_name, ai_services_enabled")
    .in("role", ["parent", "teacher"])
    .order("role", { ascending: true })
    .order("display_name", { ascending: true });

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.email) emailByUserId.set(u.id, u.email);
  }

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id as string,
    role: p.role as string,
    display_name: (p.display_name as string) ?? null,
    ai_services_enabled: p.ai_services_enabled as boolean,
    email: emailByUserId.get(p.id as string) ?? "—",
  }));

  const teachers = rows.filter((r) => r.role === "teacher");
  const parents = rows.filter((r) => r.role === "parent");

  return (
    <div className="space-y-8">
      <AiSectionTabs />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Services IA</h1>
        <p className="mt-1 text-sm text-slate-600">
          Activez ou désactivez par compte la transcription automatique des cours
          et l&apos;envoi des résumés par email. Désactivé par défaut.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Enseignants — transcription + entraînement du jumeau IA
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Nom</th>
                <th className="p-3 text-left font-semibold text-slate-700">Email</th>
                <th className="p-3 text-right font-semibold text-slate-700">IA activée</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-3">{u.display_name ?? "—"}</td>
                  <td className="p-3 text-slate-500">{u.email}</td>
                  <td className="p-3 text-right">
                    <AiServicesToggle userId={u.id} initialEnabled={u.ai_services_enabled} />
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Parents — réception des résumés de cours par email
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Nom</th>
                <th className="p-3 text-left font-semibold text-slate-700">Email</th>
                <th className="p-3 text-right font-semibold text-slate-700">IA activée</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-3">{u.display_name ?? "—"}</td>
                  <td className="p-3 text-slate-500">{u.email}</td>
                  <td className="p-3 text-right">
                    <AiServicesToggle userId={u.id} initialEnabled={u.ai_services_enabled} />
                  </td>
                </tr>
              ))}
              {parents.length === 0 && (
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
