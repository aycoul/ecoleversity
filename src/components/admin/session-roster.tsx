import Image from "next/image";
import { GRADE_LEVEL_LABELS, type GradeLevel } from "@/types/domain";

type Learner = {
  learnerId: string;
  firstName: string;
  gradeLevel: string;
  age: number | null;
  avatarUrl: string | null;
  parentId: string;
  parentName: string;
  enrolledAt: string;
};

/**
 * Roster of kids enrolled in a session — admin and teacher both render
 * this. Server component; no interactive bits beyond the link to the
 * parent's record.
 */
export function SessionRoster({ learners }: { learners: Learner[] }) {
  if (learners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">Aucun élève inscrit pour le moment.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Élèves inscrits ({learners.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {learners.map((l) => {
          const enrolledAt = l.enrolledAt
            ? new Date(l.enrolledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
            : "—";
          const gradeLabel = GRADE_LEVEL_LABELS[l.gradeLevel as GradeLevel] ?? l.gradeLevel;
          return (
            <div
              key={l.learnerId}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="size-12 shrink-0 overflow-hidden rounded-full bg-[var(--ev-blue-50)]">
                {l.avatarUrl ? (
                  <Image
                    src={l.avatarUrl}
                    alt={l.firstName}
                    width={48}
                    height={48}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-lg font-bold text-[var(--ev-blue)]">
                    {l.firstName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-slate-900">{l.firstName}</p>
                <p className="text-xs text-slate-500">
                  {gradeLabel}
                  {l.age !== null && ` · ${l.age} ans`}
                </p>
                <p className="text-xs text-slate-500">
                  Parent : <span className="font-medium text-slate-700">{l.parentName}</span>
                </p>
                <p className="text-xs text-slate-400">Inscrit le {enrolledAt}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
