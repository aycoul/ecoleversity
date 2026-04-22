export default function MarketplaceLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>

      {/* Filter bar skeleton */}
      <div className="hidden items-end gap-4 md:flex">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
