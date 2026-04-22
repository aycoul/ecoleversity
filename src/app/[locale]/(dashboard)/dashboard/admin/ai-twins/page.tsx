import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";

/**
 * Admin-only inspector for AI teacher twins.
 *
 * The twin concept is intentionally hidden from teachers, parents, and
 * learners until the training pipeline is production-ready. Admins use
 * this page to monitor how much training data has accumulated per twin
 * and flip `is_active` when a twin is cleared for public rollout.
 *
 * Public rollout is ALSO gated by the TWIN_PUBLIC_ACCESS env flag —
 * even if `is_active=true`, a non-admin surface must check the env flag
 * before exposing any twin to learners.
 */

type TwinRow = {
  id: string;
  teacher_id: string;
  subject: string;
  grade_level: string;
  maturity_level: string;
  is_active: boolean;
  total_recordings_processed: number | null;
  last_trained_at: string | null;
  created_at: string;
};

export default async function AiTwinsPage() {
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
  const { data: twins } = await admin
    .from("ai_teacher_twins")
    .select(
      "id, teacher_id, subject, grade_level, maturity_level, is_active, total_recordings_processed, last_trained_at, created_at"
    )
    .order("created_at", { ascending: false })
    .returns<TwinRow[]>();
  const twinList = twins ?? [];

  // Fetch teacher names + per-twin training counts.
  const teacherIds = Array.from(new Set(twinList.map((t) => t.teacher_id)));
  const nameById = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", teacherIds);
    for (const p of profs ?? []) {
      nameById.set(p.id as string, (p.display_name as string) ?? "—");
    }
  }

  const countByTwin = new Map<string, number>();
  if (twinList.length > 0) {
    for (const t of twinList) {
      const { count } = await admin
        .from("ai_training_content")
        .select("id", { count: "exact", head: true })
        .eq("twin_id", t.id);
      countByTwin.set(t.id, count ?? 0);
    }
  }

  const publicAccessEnabled = process.env.TWIN_PUBLIC_ACCESS === "true";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Jumeaux IA des enseignants</h1>
        <p className="mt-1 text-sm text-slate-600">
          Surveillance des agents jumeaux en entraînement. Chaque ligne agrège les
          séances enregistrées d&apos;un enseignant sur une matière + un niveau.
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 text-sm ${
          publicAccessEnabled
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
      >
        <div className="font-semibold">
          Accès public : {publicAccessEnabled ? "ACTIVÉ" : "désactivé"}
        </div>
        <p className="mt-1">
          Tant que la variable d&apos;environnement{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs">TWIN_PUBLIC_ACCESS</code>{" "}
          vaut <code>false</code>, seuls les admins peuvent accéder aux jumeaux IA. Les
          enseignants et élèves ne voient aucune interface de jumeau. Les transcriptions
          et résumés continuent d&apos;être collectés en arrière-plan.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-700">Enseignant</th>
              <th className="p-3 text-left font-semibold text-slate-700">Matière</th>
              <th className="p-3 text-left font-semibold text-slate-700">Niveau</th>
              <th className="p-3 text-right font-semibold text-slate-700">Séances</th>
              <th className="p-3 text-left font-semibold text-slate-700">Maturité</th>
              <th className="p-3 text-left font-semibold text-slate-700">Dernière MAJ</th>
              <th className="p-3 text-right font-semibold text-slate-700">Actif</th>
            </tr>
          </thead>
          <tbody>
            {twinList.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="p-3">{nameById.get(t.teacher_id) ?? "—"}</td>
                <td className="p-3">
                  {SUBJECT_LABELS[t.subject as Subject] ?? t.subject}
                </td>
                <td className="p-3 uppercase text-slate-600">{t.grade_level}</td>
                <td className="p-3 text-right tabular-nums">
                  {countByTwin.get(t.id) ?? 0}
                </td>
                <td className="p-3 text-slate-600">{t.maturity_level}</td>
                <td className="p-3 text-xs text-slate-500">
                  {t.last_trained_at
                    ? new Date(t.last_trained_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Africa/Abidjan",
                      })
                    : "—"}
                </td>
                <td className="p-3 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      t.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
              </tr>
            ))}
            {twinList.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-sm text-slate-500">
                  Aucun jumeau IA — les premières séances transcrites en créeront automatiquement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
