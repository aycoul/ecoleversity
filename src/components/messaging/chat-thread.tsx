"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { MessageInput } from "./message-input";
import { cn } from "@/lib/utils";
import { FileText, Download, AlertTriangle } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  content_flagged: boolean;
  attachments: { name: string; url: string; size: number }[];
  read_at: string | null;
  created_at: string;
};

type ChatThreadProps = {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
};

export function ChatThread({
  conversationId,
  currentUserId,
  otherUserName,
}: ChatThreadProps) {
  const t = useTranslations("messaging");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        // API returns newest first, reverse for display
        setMessages((data.messages as Message[]).reverse());
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("fr-CI", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return t("today");
    if (diffDays === 1) return t("yesterday");
    return date.toLocaleDateString("fr-CI", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // Group messages by date
  function groupByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    for (const msg of msgs) {
      const d = new Date(msg.created_at).toDateString();
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: msg.created_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--ev-blue)] border-t-transparent" />
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-400">
              {t("noConversations")}
            </p>
          </div>
        )}

        {grouped.map((group, gi) => (
          <div key={gi}>
            {/* Date separator */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">
                {formatDate(group.date)}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Messages */}
            {group.messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "mb-2 flex",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2",
                      isMine
                        ? "rounded-br-md bg-[var(--ev-blue)] text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-900"
                    )}
                  >
                    {/* Flagged warning */}
                    {msg.content_flagged && (
                      <div
                        className={cn(
                          "mb-1 flex items-center gap-1 text-xs",
                          isMine
                            ? "text-[var(--ev-green)]/20"
                            : "text-amber-600"
                        )}
                      >
                        <AlertTriangle className="size-3" />
                        <span>{t("contactBlocked")}</span>
                      </div>
                    )}

                    {/* Content */}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Attachments */}
                    {msg.attachments &&
                      (
                        msg.attachments as {
                          name: string;
                          url: string;
                          size: number;
                        }[]
                      ).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(
                            msg.attachments as {
                              name: string;
                              url: string;
                              size: number;
                            }[]
                          ).map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
                                isMine
                                  ? "bg-[var(--ev-blue-light)]/50 text-[var(--ev-green)] hover:bg-[var(--ev-blue-light)]"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              )}
                            >
                              <FileText className="size-3.5 shrink-0" />
                              <span className="truncate">{att.name}</span>
                              <span className="shrink-0">
                                ({formatFileSize(att.size)})
                              </span>
                              <Download className="size-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}

                    {/* Timestamp */}
                    <p
                      className={cn(
                        "mt-1 text-right text-[10px]",
                        isMine ? "text-[var(--ev-green)]/20" : "text-slate-400"
                      )}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        onMessageSent={fetchMessages}
      />
    </div>
  );
}
