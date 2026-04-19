import { createAdminClient } from "@/lib/supabase/admin";

export type DailyBucket = {
  /** YYYY-MM-DD (UTC day) */
  day: string;
  signups: number;
  signupsParent: number;
  signupsTeacher: number;
  revenueXof: number;
  gmvXof: number;
  sessionsScheduled: number;
  sessionsCompleted: number;
};

export type AnalyticsSnapshot = {
  /** Ordered oldest → newest. length === days (fills zeros for silent days). */
  series: DailyBucket[];
  totals: {
    signups: number;
    signupsParent: number;
    signupsTeacher: number;
    revenueXof: number;
    gmvXof: number;
    sessionsScheduled: number;
    sessionsCompleted: number;
    completionRate: number | null;
  };
};

function toDayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function buildEmptySeries(days: number): Map<string, DailyBucket> {
  const series = new Map<string, DailyBucket>();
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = toDayKey(d.toISOString());
    series.set(key, {
      day: key,
      signups: 0,
      signupsParent: 0,
      signupsTeacher: 0,
      revenueXof: 0,
      gmvXof: 0,
      sessionsScheduled: 0,
      sessionsCompleted: 0,
    });
  }
  return series;
}

export async function loadAnalyticsSnapshot(
  days: number = 30
): Promise<AnalyticsSnapshot> {
  const supabase = createAdminClient();

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCHours(0, 0, 0, 0);
  windowStart.setUTCDate(windowStart.getUTCDate() - (days - 1));
  const startIso = windowStart.toISOString();
  const endIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const series = buildEmptySeries(days);

  // Signups — profiles.created_at by role
  const { data: signups } = await supabase
    .from("profiles")
    .select("created_at, role")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  for (const p of signups ?? []) {
    const key = toDayKey(p.created_at as string);
    const bucket = series.get(key);
    if (!bucket) continue;
    bucket.signups += 1;
    if (p.role === "parent") bucket.signupsParent += 1;
    if (p.role === "teacher") bucket.signupsTeacher += 1;
  }

  // Revenue + GMV — confirmed transactions
  const { data: txs } = await supabase
    .from("transactions")
    .select("created_at, amount_xof, commission_amount")
    .eq("status", "confirmed")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  for (const tx of txs ?? []) {
    const key = toDayKey(tx.created_at as string);
    const bucket = series.get(key);
    if (!bucket) continue;
    bucket.gmvXof += (tx.amount_xof as number) ?? 0;
    bucket.revenueXof += (tx.commission_amount as number) ?? 0;
  }

  // Sessions — scheduled vs completed, using live_classes.scheduled_at as the day
  const { data: liveClasses } = await supabase
    .from("live_classes")
    .select("scheduled_at, status")
    .gte("scheduled_at", startIso)
    .lte("scheduled_at", endIso);

  for (const c of liveClasses ?? []) {
    const key = toDayKey(c.scheduled_at as string);
    const bucket = series.get(key);
    if (!bucket) continue;
    bucket.sessionsScheduled += 1;
    if (c.status === "completed") bucket.sessionsCompleted += 1;
  }

  const arr = Array.from(series.values());
  const totals = arr.reduce(
    (sum, b) => ({
      signups: sum.signups + b.signups,
      signupsParent: sum.signupsParent + b.signupsParent,
      signupsTeacher: sum.signupsTeacher + b.signupsTeacher,
      revenueXof: sum.revenueXof + b.revenueXof,
      gmvXof: sum.gmvXof + b.gmvXof,
      sessionsScheduled: sum.sessionsScheduled + b.sessionsScheduled,
      sessionsCompleted: sum.sessionsCompleted + b.sessionsCompleted,
    }),
    {
      signups: 0,
      signupsParent: 0,
      signupsTeacher: 0,
      revenueXof: 0,
      gmvXof: 0,
      sessionsScheduled: 0,
      sessionsCompleted: 0,
    }
  );

  return {
    series: arr,
    totals: {
      ...totals,
      completionRate:
        totals.sessionsScheduled > 0
          ? totals.sessionsCompleted / totals.sessionsScheduled
          : null,
    },
  };
}
