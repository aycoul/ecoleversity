import { createAdminClient } from "@/lib/supabase/admin";

export type ReportStatus = "pending" | "reviewed" | "action_taken" | "dismissed";

export type EnrichedReport = {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedType: "message" | "review" | "teacher" | "course" | "class";
  reportedId: string;
  category: string;
  description: string | null;
  status: ReportStatus;
  adminNotes: string | null;
  createdAt: string;
  /** Short quoted excerpt of the offending content — may be null if the
   *  reported record has been deleted since the report was filed. */
  excerpt: string | null;
  /** Display name of the person behind the reported content (message
   *  sender, review author, teacher, course owner). */
  offenderName: string | null;
  /** The offender's profile UUID — used to pre-fill the strike modal. */
  offenderId: string | null;
};

/**
 * Fetch content reports filtered by status, enriched with reporter name,
 * a short excerpt of the offending content, and the offender's identity
 * (so the admin can one-click create a strike without extra navigation).
 *
 * We do N+1 shaped lookups here on purpose — the volume is small
 * (reports are rare) and the 5 polymorphic types each need a distinct
 * query. Cleaner than a union-all view, easier to maintain.
 */
export async function loadReports(status: ReportStatus): Promise<EnrichedReport[]> {
  const supabase = createAdminClient();

  const { data: reports } = await supabase
    .from("content_reports")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!reports || reports.length === 0) return [];

  // Batch-fetch reporter profiles once
  const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));
  const { data: reporters } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", reporterIds);
  const reporterById = new Map(
    (reporters ?? []).map((p) => [p.id as string, p.display_name as string])
  );

  const enriched: EnrichedReport[] = await Promise.all(
    reports.map(async (r) => {
      const base = {
        id: r.id as string,
        reporterId: r.reporter_id as string,
        reporterName: reporterById.get(r.reporter_id as string) ?? "—",
        reportedType: r.reported_type as EnrichedReport["reportedType"],
        reportedId: r.reported_id as string,
        category: r.category as string,
        description: (r.description as string | null) ?? null,
        status: r.status as ReportStatus,
        adminNotes: (r.admin_notes as string | null) ?? null,
        createdAt: r.created_at as string,
        excerpt: null as string | null,
        offenderName: null as string | null,
        offenderId: null as string | null,
      };

      // Polymorphic enrichment per reported_type
      switch (r.reported_type) {
        case "message": {
          const { data: msg } = await supabase
            .from("messages")
            .select("content, sender_id")
            .eq("id", r.reported_id)
            .maybeSingle();
          if (msg) {
            base.excerpt = (msg.content as string)?.slice(0, 200) ?? null;
            base.offenderId = msg.sender_id as string;
          }
          break;
        }
        case "review": {
          const { data: review } = await supabase
            .from("reviews")
            .select("comment, reviewer_id")
            .eq("id", r.reported_id)
            .maybeSingle();
          if (review) {
            base.excerpt = (review.comment as string)?.slice(0, 200) ?? null;
            base.offenderId = review.reviewer_id as string;
          }
          break;
        }
        case "teacher": {
          base.offenderId = r.reported_id as string;
          const { data: teacherProfile } = await supabase
            .from("profiles")
            .select("bio")
            .eq("id", r.reported_id)
            .maybeSingle();
          base.excerpt = (teacherProfile?.bio as string | null) ?? null;
          break;
        }
        case "course": {
          const { data: course } = await supabase
            .from("courses")
            .select("title, teacher_id")
            .eq("id", r.reported_id)
            .maybeSingle();
          if (course) {
            base.excerpt = course.title as string;
            base.offenderId = course.teacher_id as string;
          }
          break;
        }
        case "class": {
          const { data: cls } = await supabase
            .from("live_classes")
            .select("title, teacher_id")
            .eq("id", r.reported_id)
            .maybeSingle();
          if (cls) {
            base.excerpt = cls.title as string;
            base.offenderId = cls.teacher_id as string;
          }
          break;
        }
      }

      if (base.offenderId) {
        const { data: offender } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", base.offenderId)
          .maybeSingle();
        base.offenderName = (offender?.display_name as string | null) ?? null;
      }

      return base;
    })
  );

  return enriched;
}

export async function countReportsByStatus(): Promise<
  Record<ReportStatus, number>
> {
  const supabase = createAdminClient();
  const statuses: ReportStatus[] = [
    "pending",
    "reviewed",
    "action_taken",
    "dismissed",
  ];
  const counts: Record<ReportStatus, number> = {
    pending: 0,
    reviewed: 0,
    action_taken: 0,
    dismissed: 0,
  };
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    })
  );
  return counts;
}
