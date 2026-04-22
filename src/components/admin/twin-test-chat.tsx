"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Inline admin test-chat for a specific twin. Talks to /api/twins/[twinId]/chat
 * with debug:true so we see retrieved chunks + token usage alongside each reply.
 * Strictly for quality iteration before the twin goes public.
 */

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chunk = {
  text: string;
  speaker: string;
  similarity: number;
};

type DebugReply = {
  reply: string;
  conversationId: string | null;
  retrievedChunks?: Chunk[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

export function TwinTestChat({ twinId }: { twinId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [debugByIdx, setDebugByIdx] = useState<Record<number, DebugReply>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      const res = await fetch(`/api/twins/${twinId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          debug: true,
        }),
      });
      const data = (await res.json()) as DebugReply & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Échec");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content: data.reply }];
        setDebugByIdx((d) => ({ ...d, [next.length - 1]: data }));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec réseau");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
    setDebugByIdx({});
    setError(null);
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div className="text-sm font-semibold text-slate-900">
          Test du jumeau (admin uniquement)
        </div>
        <button
          onClick={reset}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Nouvelle conversation
        </button>
      </div>

      <div className="max-h-[480px] min-h-[200px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-400">
            Envoie un message pour tester le jumeau. Les extraits récupérés et le
            nombre de tokens s&apos;affichent sous chaque réponse.
          </div>
        )}
        {messages.map((m, i) => {
          const debug = debugByIdx[i];
          return (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[var(--ev-blue)] text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {m.content}
                {debug && (
                  <details className="mt-2 text-xs opacity-70">
                    <summary className="cursor-pointer">
                      Debug ·{" "}
                      {debug.retrievedChunks?.length ?? 0} extraits ·{" "}
                      {(debug.usage?.input_tokens ?? 0) +
                        (debug.usage?.output_tokens ?? 0)}{" "}
                      tokens
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {(debug.retrievedChunks ?? []).map((c, j) => (
                        <div
                          key={j}
                          className="rounded bg-white/70 p-2 text-slate-700"
                        >
                          <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                            {c.speaker} · sim {c.similarity.toFixed(2)}
                          </div>
                          <div className="mt-1">{c.text}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3">
        {error && (
          <div className="mb-2 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
            {error}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose une question comme un élève…"
            disabled={sending}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-md bg-[var(--ev-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--ev-blue-light)] disabled:opacity-60"
          >
            {sending ? "…" : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
