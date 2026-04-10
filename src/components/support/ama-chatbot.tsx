"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Send,
  Loader2,
  AlertCircle,
  MessageCircle,
  X,
  Sparkles,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AmaChatbotProps = {
  embedded?: boolean; // false = floating widget, true = full page
};

export function AmaChatbot({ embedded = false }: AmaChatbotProps) {
  const t = useTranslations("ama");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("greeting") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [isOpen, setIsOpen] = useState(embedded);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const json = await res.json();
      if (json.data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.data.reply },
        ]);
        if (json.data.shouldEscalate) {
          setShouldEscalate(true);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("errorReply") },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, t]);

  const handleCreateTicket = useCallback(async () => {
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Escalation depuis Ama",
          description: messages.filter((m) => m.role === "user").map((m) => m.content).join("\n"),
          category: "other",
          conversationHistory: messages,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("ticketCreated") },
        ]);
        setShouldEscalate(false);
      }
    } catch {
      // Silent fail
    }
  }, [messages, t]);

  const chatContent = (
    <div className={`flex flex-col ${embedded ? "h-[600px]" : "h-[450px]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--ev-blue)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" />
          <span className="font-semibold">Ama</span>
          <span className="text-xs text-blue-200">{t("subtitle")}</span>
        </div>
        {!embedded && (
          <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--ev-blue)] text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5">
              <Loader2 className="size-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}

        {shouldEscalate && (
          <div className="flex justify-center">
            <button
              onClick={handleCreateTicket}
              className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              <AlertCircle className="size-4" />
              {t("createTicket")}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm focus:border-[var(--ev-blue)] focus:outline-none"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || loading}
            className="size-9 rounded-full bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  // Floating widget mode
  if (!embedded) {
    return (
      <>
        {/* Floating button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[var(--ev-blue)] text-white shadow-lg shadow-[var(--ev-blue)]/30 transition-transform hover:scale-105"
          >
            <MessageCircle className="size-6" />
          </button>
        )}

        {/* Chat panel */}
        {isOpen && (
          <div className="fixed bottom-6 right-6 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {chatContent}
          </div>
        )}
      </>
    );
  }

  // Embedded mode
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {chatContent}
    </div>
  );
}
