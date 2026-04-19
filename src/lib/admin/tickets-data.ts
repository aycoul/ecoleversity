import { createAdminClient } from "@/lib/supabase/admin";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high";
export type TicketCategory =
  | "payment"
  | "technical"
  | "dispute"
  | "account"
  | "other";

export type TicketMessage = {
  role: "user" | "assistant" | "admin";
  content: string;
  timestamp: string;
};

export type EnrichedTicket = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  status: TicketStatus;
  conversation: TicketMessage[];
  escalatedFromAma: boolean;
  resolvedAt: string | null;
  createdAt: string;
  /** Seconds since the ticket was opened — used for SLA badge. */
  ageSeconds: number;
};

type Filter = {
  status?: TicketStatus | "escalated_from_ama";
};

export async function loadTickets(filter: Filter): Promise<EnrichedTicket[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter.status === "escalated_from_ama") {
    query = query.eq("escalated_from_ama", true).in("status", ["open", "in_progress"]);
  } else if (filter.status) {
    query = query.eq("status", filter.status);
  }

  const { data: tickets } = await query;
  if (!tickets || tickets.length === 0) return [];

  const userIds = Array.from(new Set(tickets.map((t) => t.user_id)));
  const { data: users } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .in("id", userIds);
  const userById = new Map(
    (users ?? []).map((u) => [
      u.id as string,
      { name: u.display_name as string, role: u.role as string },
    ])
  );

  const now = Date.now();
  return tickets.map((t) => {
    const createdAt = t.created_at as string;
    const userInfo = userById.get(t.user_id as string);
    const conv = (t.conversation as unknown) as TicketMessage[] | null;
    return {
      id: t.id as string,
      userId: t.user_id as string,
      userName: userInfo?.name ?? "—",
      userRole: userInfo?.role ?? "",
      category: t.category as TicketCategory,
      priority: t.priority as TicketPriority,
      subject: t.subject as string,
      status: t.status as TicketStatus,
      conversation: Array.isArray(conv) ? conv : [],
      escalatedFromAma: (t.escalated_from_ama as boolean) ?? false,
      resolvedAt: (t.resolved_at as string | null) ?? null,
      createdAt,
      ageSeconds: Math.floor((now - new Date(createdAt).getTime()) / 1000),
    };
  });
}

export async function countTicketsByStatus(): Promise<
  Record<TicketStatus | "escalated_from_ama", number>
> {
  const supabase = createAdminClient();
  const statuses: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

  const [open, inProgress, resolved, closed, fromAma] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("escalated_from_ama", true)
      .in("status", ["open", "in_progress"]),
  ]);

  return {
    open: open.count ?? 0,
    in_progress: inProgress.count ?? 0,
    resolved: resolved.count ?? 0,
    closed: closed.count ?? 0,
    escalated_from_ama: fromAma.count ?? 0,
  };
}

/** Used by the SLA badge — "42 min", "3 h", "2 j" in a compact form. */
export function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}
