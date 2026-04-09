"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  other: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

type ConversationListProps = {
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
};

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const t = useTranslations("messaging");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for new messages to update list
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("conversation-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("fr-CI", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) {
      return t("yesterday");
    }
    return date.toLocaleDateString("fr-CI", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--ev-blue)] border-t-transparent" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-slate-400">{t("noConversations")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
            activeId === conv.id && "bg-[var(--ev-green-50)] hover:bg-[var(--ev-green-50)]"
          )}
        >
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={conv.other.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[var(--ev-green)]/10 text-xs font-medium text-[var(--ev-blue)]">
              {getInitials(conv.other.display_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-slate-900">
                {conv.other.display_name}
              </span>
              {conv.lastMessage && (
                <span className="shrink-0 text-xs text-slate-400">
                  {formatTime(conv.lastMessage.createdAt)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs text-slate-500">
                {conv.lastMessage?.content ?? "..."}
              </p>
              {conv.unreadCount > 0 && (
                <Badge className="shrink-0 bg-[var(--ev-blue)] px-1.5 text-[10px]">
                  {conv.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
