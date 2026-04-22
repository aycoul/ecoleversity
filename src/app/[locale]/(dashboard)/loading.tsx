export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting banner skeleton */}
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100 md:h-32" />

      {/* Stats row skeleton */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>

      {/* Section header + list skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
