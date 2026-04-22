import Link from "next/link";
import { PlayCircle } from "lucide-react";

export type ContinueWatchingItem = {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  course_cover_url: string | null;
  progress_pct: number;
  last_lesson_id: string | null;
  learner_id: string;
  learner_first_name?: string;
};

export type ContinueWatchingRailProps = {
  items: ContinueWatchingItem[];
  /** If kidHref is true, links go to /k/[learner_id]/course/[id]. If false (parent), links go to /dashboard/parent/courses/[id]. */
  kidMode?: boolean;
  title?: string;
};

export function ContinueWatchingRail({
  items,
  kidMode = false,
  title = "Continue d'apprendre",
}: ContinueWatchingRailProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3">
          {items.map((item) => {
            const href = kidMode
              ? `/k/${item.learner_id}/course/${item.course_id}${item.last_lesson_id ? `/lesson/${item.last_lesson_id}` : ""}`
              : `/dashboard/parent/courses`;
            const clampedPct = Math.max(0, Math.min(100, item.progress_pct));
            return (
              <Link
                key={item.enrollment_id}
                href={href}
                className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[var(--ev-blue)] hover:shadow-md"
              >
                <div className="relative aspect-video w-full bg-slate-100">
                  {item.course_cover_url ? (
                    <img
                      src={item.course_cover_url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--ev-blue-50)]">
                      <PlayCircle className="size-10 text-[var(--ev-blue)]" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <PlayCircle className="size-12 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="line-clamp-2 text-xs font-semibold text-slate-900">
                    {item.course_title}
                  </h4>
                  {!kidMode && item.learner_first_name && (
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Pour {item.learner_first_name}
                    </p>
                  )}
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-[var(--ev-green)]"
                      style={{ width: `${clampedPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{clampedPct}%</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
