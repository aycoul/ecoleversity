"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ConversationList } from "./conversation-list";
import { ChatThread } from "./chat-thread";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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

export function Inbox() {
  const t = useTranslations("messaging");
  const searchParams = useSearchParams();
  const [active, setActive] = useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Handle ?conversationId= parameter
  useEffect(() => {
    const convId = searchParams.get("conversationId");
    if (convId && !active) {
      // Fetch the conversation to populate the active state
      fetch("/api/conversations")
        .then((res) => res.json())
        .then((conversations: Conversation[]) => {
          const found = conversations.find(
            (c: Conversation) => c.id === convId
          );
          if (found) setActive(found);
        });
    }
  }, [searchParams, active]);

  function handleSelect(conv: Conversation) {
    setActive(conv);
  }

  function handleBack() {
    setActive(null);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Left panel: conversation list */}
      <div
        className={`w-full border-r border-slate-200 md:w-80 md:block ${
          active ? "hidden" : "block"
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("title")}
          </h2>
        </div>
        <div className="overflow-y-auto" style={{ height: "calc(100% - 53px)" }}>
          <ConversationList activeId={active?.id ?? null} onSelect={handleSelect} />
        </div>
      </div>

      {/* Right panel: chat thread */}
      <div
        className={`flex flex-1 flex-col md:flex ${
          active ? "flex" : "hidden md:flex"
        }`}
      >
        {active && currentUserId ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={handleBack}
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {active.other.display_name}
                </h3>
                <p className="text-xs text-slate-400">
                  {active.other.role === "teacher"
                    ? "Enseignant"
                    : "Parent"}
                </p>
              </div>
            </div>

            <ChatThread
              conversationId={active.id}
              currentUserId={currentUserId}
              otherUserName={active.other.display_name}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageSquare className="mb-4 size-12 text-slate-200" />
            <p className="text-sm text-slate-400">{t("selectConversation")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
