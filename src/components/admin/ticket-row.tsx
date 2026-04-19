"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Loader2,
  MessageCircle,
  Sparkles,
  User,
} from "lucide-react";
import {
  formatAge,
  type EnrichedTicket,
  type TicketPriority,
} from "@/lib/admin/tickets-data";

const PRIORITY_DOT: Record<TicketPriority, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

const CATEGORY_LABEL: Record<string, string> = {
  payment: "Paiement",
  technical: "Technique",
  dispute: "Litige",
  account: "Compte",
  other: "Autre",
};

type Props = {
  ticket: EnrichedTicket;
};

export function TicketRow({ ticket }: Props) {
  const t = useTranslations("adminTickets");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState("");

  const isSlaBreached = ticket.status === "open" && ticket.ageSeconds > 7200;
  const age = formatAge(ticket.ageSeconds);

  async function patchTicket(
    nextAction:
      | "resolve"
      | "start_progress"
      | { kind: "reply"; content: string }
  ) {
    setAction(typeof nextAction === "string" ? nextAction : "reply");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/tickets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: ticket.id,
            action:
              typeof nextAction === "string" ? nextAction : nextAction.kind,
            reply:
              typeof nextAction === "object" ? nextAction.content : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "action_failed");
        }
        toast.success(
          typeof nextAction === "string"
            ? t(`toast.${nextAction}`)
            : t("toast.reply")
        );
        if (typeof nextAction === "object") setAdminReply("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      } finally {
        setAction(null);
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className={`mt-1.5 size-2 shrink-0 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {ticket.userName}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {CATEGORY_LABEL[ticket.category] ?? ticket.category}
            </span>
            {ticket.escalatedFromAma && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                <Sparkles className="size-3" />
                {t("escalatedFromAma")}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-700">
            {ticket.subject}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="size-3" />
            <span className={isSlaBreached ? "text-rose-600 font-medium" : ""}>
              {t("openedSince", { age })}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-slate-400" />
        ) : (
          <ChevronDown className="size-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          {/* Conversation viewer */}
          {ticket.conversation.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("noConversation")}
            </p>
          ) : (
            <ol className="space-y-3">
              {ticket.conversation.map((m, i) => {
                const isUser = m.role === "user";
                const isBot = m.role === "assistant";
                return (
                  <li
                    key={i}
                    className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        {isBot ? (
                          <Bot className="size-3.5 text-violet-600" />
                        ) : (
                          <User className="size-3.5 text-slate-600" />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        isUser
                          ? "bg-[var(--ev-blue)] text-white"
                          : isBot
                            ? "bg-violet-50 text-slate-800"
                            : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p>{m.content}</p>
                      {m.timestamp && (
                        <p
                          className={`mt-1 text-[10px] ${
                            isUser ? "text-white/70" : "text-slate-500"
                          }`}
                        >
                          {new Date(m.timestamp).toLocaleString("fr-CI", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Reply + actions — only shown on active tickets */}
          {(ticket.status === "open" || ticket.status === "in_progress") && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  {t("replyLabel")}
                </span>
                <textarea
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  rows={2}
                  placeholder={t("replyPlaceholder")}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-[var(--ev-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--ev-blue)]"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchTicket({ kind: "reply", content: adminReply })
                  }
                  disabled={isPending || adminReply.trim().length === 0}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--ev-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--ev-blue-light)] disabled:opacity-50"
                >
                  {isPending && action === "reply" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <MessageCircle className="size-3" />
                  )}
                  {t("sendReply")}
                </button>
                {ticket.status === "open" && (
                  <button
                    type="button"
                    onClick={() => patchTicket("start_progress")}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t("startProgress")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => patchTicket("resolve")}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {isPending && action === "resolve" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <CircleCheck className="size-3" />
                  )}
                  {t("resolve")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
