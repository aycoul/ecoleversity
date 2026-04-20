import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Ticket, CircleCheck } from "lucide-react";
import {
  loadTickets,
  countTicketsByStatus,
  type TicketStatus,
} from "@/lib/admin/tickets-data";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { TicketRow } from "@/components/admin/ticket-row";

export const dynamic = "force-dynamic";

const TAB_ORDER: Array<TicketStatus | "escalated_from_ama"> = [
  "open",
  "in_progress",
  "escalated_from_ama",
  "resolved",
];

type SearchParams = Promise<{ status?: string }>;

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();

  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (!profile || profile.role !== "admin" || !canAccess(scope, "tickets")) {
    redirect("/dashboard/admin");
  }

  const locale = await getLocale();
  const t = await getTranslations("adminTickets");
  const params = await searchParams;
  const rawStatus = params.status;
  const activeTab = (
    TAB_ORDER.includes(rawStatus as TicketStatus)
      ? rawStatus
      : "open"
  ) as TicketStatus | "escalated_from_ama";

  const [tickets, counts] = await Promise.all([
    loadTickets({ status: activeTab }),
    countTicketsByStatus(),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Ticket className="size-7 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-0">
        {TAB_ORDER.map((s) => {
          const isActive = s === activeTab;
          const count = counts[s];
          return (
            <Link
              key={s}
              href={`/${locale}/dashboard/admin/tickets?status=${s}`}
              className={`-mb-px inline-flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-[var(--ev-blue)] font-semibold text-[var(--ev-blue)]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t(`tabs.${s}`)}
              {count > 0 && (
                <span
                  className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-[var(--ev-blue)] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <CircleCheck className="mb-3 size-12 text-[var(--ev-green)]" />
          <p className="text-sm font-semibold text-slate-700">
            {t(`empty.${activeTab}`)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t("emptyHelper")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((tk) => (
            <TicketRow key={tk.id} ticket={tk} />
          ))}
        </div>
      )}
    </div>
  );
}
