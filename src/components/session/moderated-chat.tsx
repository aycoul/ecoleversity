"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useChat } from "@livekit/components-react";

type ModeratedChatProps = {
  liveClassId: string;
};

/**
 * Drop-in replacement for LiveKit's <Chat /> that routes outgoing
 * messages through /api/livekit/chat-message for PII scanning + audit
 * logging. Incoming messages still come through LiveKit's DataChannel
 * via useChat(), so rendering is unchanged from the participant's POV.
 *
 * A blocked message never reaches useChat().send() — the client shows
 * a red inline warning and clears the input.
 */
export function ModeratedChat({ liveClassId }: ModeratedChatProps) {
  const { chatMessages, send, isSending } = useChat();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      // Server moderates first — blocked messages never broadcast.
      const res = await fetch("/api/livekit/chat-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId, content }),
      });

      if (res.status === 422) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Message bloqué : informations personnelles détectées.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec de l'envoi. Réessayez.");
        return;
      }

      // Clean → broadcast via LiveKit
      await send(content);
      setInput("");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm text-white">
        {chatMessages.length === 0 ? (
          <li className="py-8 text-center text-xs text-white/50">
            Aucun message. Soyez le premier à écrire !
          </li>
        ) : (
          chatMessages.map((msg, i) => (
            <li key={`${msg.timestamp}-${i}`} className="flex flex-col gap-0.5">
              <span className="text-[0.7rem] font-medium text-white/60">
                {msg.from?.name ?? "Invité"}
              </span>
              <span className="whitespace-pre-wrap break-words rounded-lg bg-white/10 px-2.5 py-1.5 text-sm">
                {msg.message}
              </span>
            </li>
          ))
        )}
      </ul>

      {error && (
        <div className="mx-3 mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/10 p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez un message…"
          maxLength={2000}
          className="flex-1 rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none"
          disabled={submitting || isSending}
        />
        <button
          type="submit"
          disabled={submitting || isSending || !input.trim()}
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
