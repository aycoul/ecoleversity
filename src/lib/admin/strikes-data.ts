import { createAdminClient } from "@/lib/supabase/admin";

export type StrikeLevel = "warning" | "strike_1" | "strike_2" | "strike_3";
export type StrikeStatus = "active" | "expired" | "appealed" | "revoked";

export type StrikeRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  strikeLevel: StrikeLevel;
  reason: string;
  evidence: Record<string, unknown>;
  issuedById: string;
  issuedByName: string | null;
  expiresAt: string | null;
  status: StrikeStatus;
  createdAt: string;
};

/**
 * Grouped strike history: per teacher, all strikes (all statuses) ordered
 * newest first. Used by /admin/strikes to render the collapsible history
 * timeline under each teacher.
 */
export type TeacherStrikeGroup = {
  teacherId: string;
  teacherName: string;
  currentLevel: StrikeLevel | null;
  activeStrikes: number;
  totalStrikes: number;
  strikes: StrikeRow[];
};

const LEVEL_ORDER: StrikeLevel[] = [
  "warning",
  "strike_1",
  "strike_2",
  "strike_3",
];

export async function loadStrikesGroupedByTeacher(): Promise<
  TeacherStrikeGroup[]
> {
  const supabase = createAdminClient();

  const { data: strikes } = await supabase
    .from("teacher_strikes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!strikes || strikes.length === 0) return [];

  // Batch-fetch teacher + issuer display names
  const ids = Array.from(
    new Set([
      ...strikes.map((s) => s.teacher_id as string),
      ...strikes.map((s) => s.issued_by as string),
    ])
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.display_name as string])
  );

  const rows: StrikeRow[] = strikes.map((s) => ({
    id: s.id as string,
    teacherId: s.teacher_id as string,
    teacherName: nameById.get(s.teacher_id as string) ?? "—",
    strikeLevel: s.strike_level as StrikeLevel,
    reason: s.reason as string,
    evidence: (s.evidence as Record<string, unknown>) ?? {},
    issuedById: s.issued_by as string,
    issuedByName: nameById.get(s.issued_by as string) ?? null,
    expiresAt: (s.expires_at as string | null) ?? null,
    status: s.status as StrikeStatus,
    createdAt: s.created_at as string,
  }));

  // Group by teacher
  const byTeacher = new Map<string, TeacherStrikeGroup>();
  for (const row of rows) {
    if (!byTeacher.has(row.teacherId)) {
      byTeacher.set(row.teacherId, {
        teacherId: row.teacherId,
        teacherName: row.teacherName,
        currentLevel: null,
        activeStrikes: 0,
        totalStrikes: 0,
        strikes: [],
      });
    }
    const g = byTeacher.get(row.teacherId)!;
    g.strikes.push(row);
    g.totalStrikes += 1;
    if (row.status === "active") g.activeStrikes += 1;
  }

  // Derive currentLevel = highest level among active strikes
  for (const g of byTeacher.values()) {
    const actives = g.strikes.filter((s) => s.status === "active");
    if (actives.length > 0) {
      actives.sort(
        (a, b) =>
          LEVEL_ORDER.indexOf(b.strikeLevel) -
          LEVEL_ORDER.indexOf(a.strikeLevel)
      );
      g.currentLevel = actives[0].strikeLevel;
    }
  }

  // Sort: teachers with active strikes first, then by recency
  return Array.from(byTeacher.values()).sort((a, b) => {
    if ((b.activeStrikes > 0 ? 1 : 0) !== (a.activeStrikes > 0 ? 1 : 0)) {
      return (b.activeStrikes > 0 ? 1 : 0) - (a.activeStrikes > 0 ? 1 : 0);
    }
    return (
      new Date(b.strikes[0].createdAt).getTime() -
      new Date(a.strikes[0].createdAt).getTime()
    );
  });
}

/** Headline counts for the strikes page hero row. */
export async function countStrikeStats(): Promise<{
  activeTotal: number;
  appealsPending: number;
  teachersRestricted: number;
}> {
  const supabase = createAdminClient();

  const [activeRes, appealRes, bannedRes] = await Promise.all([
    supabase
      .from("teacher_strikes")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("teacher_strikes")
      .select("id", { count: "exact", head: true })
      .eq("status", "appealed"),
    supabase
      .from("teacher_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "banned"),
  ]);

  return {
    activeTotal: activeRes.count ?? 0,
    appealsPending: appealRes.count ?? 0,
    teachersRestricted: bannedRes.count ?? 0,
  };
}
