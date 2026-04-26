import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Finance dashboard data loader.
 *
 * Pulls confirmed transactions, completed payouts, and approved refunds
 * over a period and bucketizes them daily / weekly / monthly. Computes
 * period-over-period deltas by re-running the same aggregation against
 * the previous window of identical length.
 *
 * Money columns are integer XOF; we never use floats here.
 */

export type Granularity = "day" | "week" | "month";

export type PeriodBucket = {
  /** ISO key — YYYY-MM-DD for day, YYYY-WNN for week, YYYY-MM for month. */
  key: string;
  /** Human label rendered on the X axis. */
  label: string;
  gmvXof: number;
  commissionXof: number;
  payoutsXof: number;
  refundsXof: number;
  txCount: number;
};

export type ProviderTotal = {
  provider: string;
  gmvXof: number;
  txCount: number;
};

export type TeacherTotal = {
  teacherId: string;
  displayName: string;
  gmvXof: number;
  commissionXof: number;
  txCount: number;
};

export type FinanceTotals = {
  gmvXof: number;
  commissionXof: number;
  payoutsXof: number;
  refundsXof: number;
  txCount: number;
  netMarginXof: number;
};

export type CompareMode = "previous_period" | "previous_year";

export type FinanceSnapshot = {
  range: { startIso: string; endIso: string; days: number };
  granularity: Granularity;
  compareMode: CompareMode;
  /** Label for the comparison window — surfaced in tooltips. */
  compareLabel: string;
  buckets: PeriodBucket[];
  /** Per-bucket comparison series (same length, same labels in current period). */
  comparisonBuckets: number[];
  totals: FinanceTotals;
  /** Same shape as totals but for the comparison window. */
  previousTotals: FinanceTotals;
  byProvider: ProviderTotal[];
  topTeachers: TeacherTotal[];
};

const ZERO_TOTALS: FinanceTotals = {
  gmvXof: 0,
  commissionXof: 0,
  payoutsXof: 0,
  refundsXof: 0,
  txCount: 0,
  netMarginXof: 0,
};

function dayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toISOString().slice(0, 10);
}

function weekKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  // ISO week — Thursday-based per RFC 5545. This produces YYYY-WNN.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7; // 0..6, Monday=0
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((t.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function bucketKey(iso: string | Date, gran: Granularity): string {
  return gran === "day" ? dayKey(iso) : gran === "week" ? weekKey(iso) : monthKey(iso);
}

function bucketLabel(key: string, gran: Granularity): string {
  if (gran === "day") {
    const d = new Date(`${key}T00:00:00Z`);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  }
  if (gran === "week") {
    return key.replace(/^\d{4}-/, "S");
  }
  // month
  const [y, m] = key.split("-");
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function buildEmptyBuckets(
  startIso: string,
  endIso: string,
  gran: Granularity
): Map<string, PeriodBucket> {
  const out = new Map<string, PeriodBucket>();
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (gran === "day") {
    const cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);
    while (cur <= end) {
      const k = dayKey(cur);
      out.set(k, {
        key: k, label: bucketLabel(k, gran),
        gmvXof: 0, commissionXof: 0, payoutsXof: 0, refundsXof: 0, txCount: 0,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (gran === "week") {
    const cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);
    while (cur <= end) {
      const k = weekKey(cur);
      if (!out.has(k)) {
        out.set(k, {
          key: k, label: bucketLabel(k, gran),
          gmvXof: 0, commissionXof: 0, payoutsXof: 0, refundsXof: 0, txCount: 0,
        });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else {
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cur <= end) {
      const k = monthKey(cur);
      out.set(k, {
        key: k, label: bucketLabel(k, gran),
        gmvXof: 0, commissionXof: 0, payoutsXof: 0, refundsXof: 0, txCount: 0,
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }
  return out;
}

export async function loadFinanceSnapshot(opts: {
  days: number;
  granularity: Granularity;
  compareMode?: CompareMode;
}): Promise<FinanceSnapshot> {
  const supabase = createAdminClient();
  const days = opts.days;
  const gran = opts.granularity;
  const compareMode: CompareMode = opts.compareMode ?? "previous_period";

  const now = new Date();
  const endIso = now.toISOString();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startIso = start.toISOString();

  // Comparison window. previous_period = the equal-length window
  // immediately before; previous_year = same calendar dates 365 days
  // earlier — pinpoints YoY growth without month-length drift.
  const prevStart = new Date(start);
  const prevEnd = new Date(now);
  if (compareMode === "previous_year") {
    prevStart.setUTCFullYear(prevStart.getUTCFullYear() - 1);
    prevEnd.setUTCFullYear(prevEnd.getUTCFullYear() - 1);
  } else {
    prevStart.setUTCDate(prevStart.getUTCDate() - days);
    prevEnd.setTime(start.getTime() - 1);
  }
  const prevStartIso = prevStart.toISOString();
  const prevEndIso = prevEnd.toISOString();
  const compareLabel =
    compareMode === "previous_year"
      ? `Année précédente (${prevStart.toISOString().slice(0, 10)} → ${prevEnd.toISOString().slice(0, 10)})`
      : `Période précédente (${prevStart.toISOString().slice(0, 10)} → ${prevEnd.toISOString().slice(0, 10)})`;

  // Aggregations live in three queries. We pull just what's needed and
  // group in JS — the tables are small at MVP scale.
  const [
    { data: txs },
    { data: payouts },
    { data: refunds },
    { data: prevTxs },
    { data: prevPayouts },
    { data: prevRefunds },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("created_at, amount_xof, commission_amount, teacher_id, payment_provider")
      .eq("status", "confirmed")
      .eq("type", "class_booking")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("teacher_payouts")
      .select("processed_at, amount_xof")
      .eq("status", "completed")
      .gte("processed_at", startIso)
      .lte("processed_at", endIso),
    supabase
      .from("refund_requests")
      .select("processed_at, approved_amount_xof, status")
      .eq("status", "approved")
      .gte("processed_at", startIso)
      .lte("processed_at", endIso),
    supabase
      .from("transactions")
      .select("created_at, amount_xof, commission_amount")
      .eq("status", "confirmed")
      .eq("type", "class_booking")
      .gte("created_at", prevStartIso)
      .lte("created_at", prevEndIso),
    supabase
      .from("teacher_payouts")
      .select("amount_xof")
      .eq("status", "completed")
      .gte("processed_at", prevStartIso)
      .lte("processed_at", prevEndIso),
    supabase
      .from("refund_requests")
      .select("approved_amount_xof")
      .eq("status", "approved")
      .gte("processed_at", prevStartIso)
      .lte("processed_at", prevEndIso),
  ]);

  const buckets = buildEmptyBuckets(startIso, endIso, gran);
  const totals: FinanceTotals = { ...ZERO_TOTALS };
  const providerMap = new Map<string, ProviderTotal>();
  const teacherMap = new Map<string, { gmv: number; commission: number; count: number }>();

  for (const tx of txs ?? []) {
    const k = bucketKey(tx.created_at as string, gran);
    const b = buckets.get(k);
    const gmv = (tx.amount_xof as number) ?? 0;
    const com = (tx.commission_amount as number) ?? 0;
    if (b) {
      b.gmvXof += gmv;
      b.commissionXof += com;
      b.txCount += 1;
    }
    totals.gmvXof += gmv;
    totals.commissionXof += com;
    totals.txCount += 1;

    const prov = ((tx.payment_provider as string | null) ?? "inconnu").toLowerCase();
    const pe = providerMap.get(prov) ?? { provider: prov, gmvXof: 0, txCount: 0 };
    pe.gmvXof += gmv;
    pe.txCount += 1;
    providerMap.set(prov, pe);

    const tid = tx.teacher_id as string;
    const te = teacherMap.get(tid) ?? { gmv: 0, commission: 0, count: 0 };
    te.gmv += gmv;
    te.commission += com;
    te.count += 1;
    teacherMap.set(tid, te);
  }

  for (const p of payouts ?? []) {
    const ts = (p.processed_at as string | null) ?? "";
    if (!ts) continue;
    const k = bucketKey(ts, gran);
    const b = buckets.get(k);
    const v = (p.amount_xof as number) ?? 0;
    if (b) b.payoutsXof += v;
    totals.payoutsXof += v;
  }

  for (const r of refunds ?? []) {
    const ts = (r.processed_at as string | null) ?? "";
    if (!ts) continue;
    const k = bucketKey(ts, gran);
    const b = buckets.get(k);
    const v = (r.approved_amount_xof as number) ?? 0;
    if (b) b.refundsXof += v;
    totals.refundsXof += v;
  }

  totals.netMarginXof = totals.commissionXof - totals.refundsXof;

  // Comparison-window totals. We also bucketize the comparison TX
  // series by mapping its dates back into the current window's bucket
  // keys so the chart can overlay them directly.
  const previousTotals: FinanceTotals = { ...ZERO_TOTALS };
  const offsetMs = start.getTime() - prevStart.getTime();
  const comparisonByKey = new Map<string, number>();
  for (const tx of prevTxs ?? []) {
    const gmv = (tx.amount_xof as number) ?? 0;
    previousTotals.gmvXof += gmv;
    previousTotals.commissionXof += (tx.commission_amount as number) ?? 0;
    previousTotals.txCount += 1;
    // Shift the date forward into the current window so the same
    // bucket key matches the bar we want to overlay.
    const shifted = new Date(new Date(tx.created_at as string).getTime() + offsetMs);
    const k = bucketKey(shifted, gran);
    comparisonByKey.set(k, (comparisonByKey.get(k) ?? 0) + gmv);
  }
  for (const p of prevPayouts ?? []) {
    previousTotals.payoutsXof += (p.amount_xof as number) ?? 0;
  }
  for (const r of prevRefunds ?? []) {
    previousTotals.refundsXof += (r.approved_amount_xof as number) ?? 0;
  }
  previousTotals.netMarginXof = previousTotals.commissionXof - previousTotals.refundsXof;
  const comparisonBuckets = Array.from(buckets.values()).map(
    (b) => comparisonByKey.get(b.key) ?? 0
  );

  // Top teachers — resolve display names in one batched query.
  const teacherIds = Array.from(teacherMap.keys());
  let nameById = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", teacherIds);
    nameById = new Map((profs ?? []).map((p) => [p.id as string, (p.display_name as string) ?? "—"]));
  }
  const topTeachers: TeacherTotal[] = teacherIds
    .map((id) => ({
      teacherId: id,
      displayName: nameById.get(id) ?? "—",
      gmvXof: teacherMap.get(id)!.gmv,
      commissionXof: teacherMap.get(id)!.commission,
      txCount: teacherMap.get(id)!.count,
    }))
    .sort((a, b) => b.gmvXof - a.gmvXof)
    .slice(0, 10);

  const byProvider = Array.from(providerMap.values()).sort((a, b) => b.gmvXof - a.gmvXof);

  return {
    range: { startIso, endIso, days },
    granularity: gran,
    compareMode,
    compareLabel,
    buckets: Array.from(buckets.values()),
    comparisonBuckets,
    totals,
    previousTotals,
    byProvider,
    topTeachers,
  };
}

/**
 * Paginated fetch of historical transactions with optional filters.
 * Used by the table at the bottom of the finance page. Limit capped to
 * 100 rows per request to keep payloads bounded.
 */
export type TransactionFilters = {
  status?: "pending" | "confirmed" | "expired" | "refunded" | "all";
  provider?: string;
  startIso?: string;
  endIso?: string;
  search?: string;
  page?: number;
  perPage?: number;
};

export type TransactionRow = {
  id: string;
  parentName: string | null;
  teacherName: string | null;
  /** Kid the booking is for. May be null on legacy rows. */
  learnerFirstName: string | null;
  learnerAge: number | null;
  /** Class title — null for non-class transactions or legacy rows. */
  classTitle: string | null;
  classSubject: string | null;
  classGradeLevel: string | null;
  classScheduledAt: string | null;
  amountXof: number;
  commissionXof: number;
  teacherAmount: number;
  status: string;
  provider: string | null;
  reference: string | null;
  createdAt: string;
};

export async function listTransactions(
  filters: TransactionFilters
): Promise<{ rows: TransactionRow[]; total: number }> {
  const supabase = createAdminClient();
  const perPage = Math.min(Math.max(filters.perPage ?? 25, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = supabase
    .from("transactions")
    .select(
      "id, parent_id, teacher_id, learner_id, live_class_id, amount_xof, commission_amount, teacher_amount, status, payment_provider, payment_reference, created_at",
      { count: "exact" }
    )
    .eq("type", "class_booking")
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    q = q.eq("status", filters.status);
  }
  if (filters.provider && filters.provider !== "all") {
    q = q.eq("payment_provider", filters.provider);
  }
  if (filters.startIso) q = q.gte("created_at", filters.startIso);
  if (filters.endIso) q = q.lte("created_at", filters.endIso);
  if (filters.search) {
    const safe = filters.search.replace(/[,()%_\\]/g, "").trim();
    if (safe) q = q.ilike("payment_reference", `%${safe}%`);
  }

  const { data: txs, count } = await q.range(from, to);
  const rows = txs ?? [];

  // Resolve names + class + learner detail in 3 batched queries.
  const profileIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.parent_id as string, r.teacher_id as string]).filter(Boolean)
    )
  );
  const learnerIds = Array.from(
    new Set(rows.map((r) => r.learner_id as string | null).filter((v): v is string => !!v))
  );
  const classIds = Array.from(
    new Set(rows.map((r) => r.live_class_id as string | null).filter((v): v is string => !!v))
  );

  const [profsRes, learnersRes, classesRes] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
    learnerIds.length
      ? supabase
          .from("learner_profiles")
          .select("id, first_name, birth_year")
          .in("id", learnerIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; birth_year: number | null }[] }),
    classIds.length
      ? supabase
          .from("live_classes")
          .select("id, title, subject, grade_level, scheduled_at")
          .in("id", classIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null; subject: string | null; grade_level: string | null; scheduled_at: string | null }[] }),
  ]);

  const nameById = new Map<string, string>();
  for (const p of profsRes.data ?? []) {
    nameById.set(p.id as string, (p.display_name as string) ?? "—");
  }
  const currentYear = new Date().getUTCFullYear();
  const learnerById = new Map<string, { firstName: string; age: number | null }>();
  for (const l of learnersRes.data ?? []) {
    const by = l.birth_year as number | null;
    learnerById.set(l.id as string, {
      firstName: (l.first_name as string) ?? "—",
      age: by ? currentYear - by : null,
    });
  }
  const classById = new Map<
    string,
    { title: string | null; subject: string | null; grade_level: string | null; scheduled_at: string | null }
  >();
  for (const c of classesRes.data ?? []) {
    classById.set(c.id as string, {
      title: (c.title as string | null) ?? null,
      subject: (c.subject as string | null) ?? null,
      grade_level: (c.grade_level as string | null) ?? null,
      scheduled_at: (c.scheduled_at as string | null) ?? null,
    });
  }

  return {
    total: count ?? 0,
    rows: rows.map((r) => {
      const learner = r.learner_id ? learnerById.get(r.learner_id as string) : null;
      const cls = r.live_class_id ? classById.get(r.live_class_id as string) : null;
      return {
        id: r.id as string,
        parentName: nameById.get(r.parent_id as string) ?? null,
        teacherName: nameById.get(r.teacher_id as string) ?? null,
        learnerFirstName: learner?.firstName ?? null,
        learnerAge: learner?.age ?? null,
        classTitle: cls?.title ?? null,
        classSubject: cls?.subject ?? null,
        classGradeLevel: cls?.grade_level ?? null,
        classScheduledAt: cls?.scheduled_at ?? null,
        amountXof: (r.amount_xof as number) ?? 0,
        commissionXof: (r.commission_amount as number) ?? 0,
        teacherAmount: (r.teacher_amount as number) ?? 0,
        status: (r.status as string) ?? "—",
        provider: (r.payment_provider as string | null) ?? null,
        reference: (r.payment_reference as string | null) ?? null,
        createdAt: r.created_at as string,
      };
    }),
  };
}
