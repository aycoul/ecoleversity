"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type DataPublishOptions, type RemoteParticipant } from "livekit-client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BarChart3, Plus, X, Send, Loader2 } from "lucide-react";

// Ephemeral poll state. Lives only for the duration of the session — we
// deliberately don't persist to DB yet. If the teacher wants results
// retained, they can screenshot or we add a session_polls table in v2.
type Poll = {
  id: string;
  question: string;
  options: string[];
  startedAt: number;
};

type PollVoteMsg = {
  type: "poll_vote";
  pollId: string;
  optionIdx: number;
};
type PollStartMsg = {
  type: "poll_start";
  poll: Poll;
};
type PollEndMsg = {
  type: "poll_end";
  pollId: string;
};

const encode = (msg: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(msg));

export function SessionPoll({ userRole }: { userRole: "parent" | "teacher" }) {
  const t = useTranslations("session");
  const room = useRoomContext();

  // Teacher-side UI state
  const [composerOpen, setComposerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  // Shared state: the currently-active poll (same on teacher and students)
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  // Teacher-only tallies. Map pollId → array of vote counts per option.
  const [tallies, setTallies] = useState<Record<string, number[]>>({});
  // Per-voter dedupe so a student pressing twice only counts once.
  const votersRef = useRef<Map<string, Set<string>>>(new Map());
  // Student-only: which option this student picked (pollId → optionIdx)
  const [studentVotes, setStudentVotes] = useState<Record<string, number>>({});
  // When teacher ends a poll, we expose the final tally locally too.
  const [endedTallies, setEndedTallies] = useState<Record<string, number[]>>({});

  // Listen for all poll data messages.
  useEffect(() => {
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as
          | PollStartMsg
          | PollVoteMsg
          | PollEndMsg;

        if (msg.type === "poll_start") {
          setActivePoll(msg.poll);
          if (userRole === "teacher") {
            setTallies((prev) => ({
              ...prev,
              [msg.poll.id]: new Array(msg.poll.options.length).fill(0),
            }));
            votersRef.current.set(msg.poll.id, new Set());
          }
          return;
        }

        if (msg.type === "poll_vote" && userRole === "teacher" && participant) {
          // Dedupe per (pollId, voterIdentity)
          const set = votersRef.current.get(msg.pollId) ?? new Set();
          if (set.has(participant.identity)) return;
          set.add(participant.identity);
          votersRef.current.set(msg.pollId, set);

          setTallies((prev) => {
            const current = prev[msg.pollId];
            if (!current || msg.optionIdx < 0 || msg.optionIdx >= current.length) {
              return prev;
            }
            const next = [...current];
            next[msg.optionIdx]++;
            return { ...prev, [msg.pollId]: next };
          });
          return;
        }

        if (msg.type === "poll_end") {
          setActivePoll((p) => (p?.id === msg.pollId ? null : p));
          if (userRole === "teacher") {
            setTallies((prev) => {
              const final = prev[msg.pollId];
              if (final) setEndedTallies((e) => ({ ...e, [msg.pollId]: final }));
              return prev;
            });
          }
        }
      } catch {
        // non-JSON / unrelated packet; ignore
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, userRole]);

  const broadcast = useCallback(
    (msg: PollStartMsg | PollVoteMsg | PollEndMsg) => {
      room.localParticipant.publishData(encode(msg), {
        reliable: true,
      } as DataPublishOptions);
    },
    [room]
  );

  // ── Teacher composer ───────────────────────────────────────────────
  const startPoll = () => {
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    const q = question.trim();
    if (!q || cleaned.length < 2) {
      toast.error(t("pollValidationError"));
      return;
    }
    if (cleaned.length > 4) {
      toast.error(t("pollTooManyOptions"));
      return;
    }
    const poll: Poll = {
      id: crypto.randomUUID(),
      question: q,
      options: cleaned,
      startedAt: Date.now(),
    };
    setActivePoll(poll);
    setTallies((prev) => ({
      ...prev,
      [poll.id]: new Array(cleaned.length).fill(0),
    }));
    votersRef.current.set(poll.id, new Set());
    broadcast({ type: "poll_start", poll });
    setComposerOpen(false);
    setQuestion("");
    setOptions(["", ""]);
  };

  const endPoll = () => {
    if (!activePoll) return;
    broadcast({ type: "poll_end", pollId: activePoll.id });
    const final = tallies[activePoll.id];
    if (final) setEndedTallies((e) => ({ ...e, [activePoll.id]: final }));
    setActivePoll(null);
  };

  // ── Student vote ───────────────────────────────────────────────────
  const vote = (idx: number) => {
    if (!activePoll) return;
    if (studentVotes[activePoll.id] !== undefined) return; // can't revote
    broadcast({
      type: "poll_vote",
      pollId: activePoll.id,
      optionIdx: idx,
    });
    setStudentVotes((prev) => ({ ...prev, [activePoll.id]: idx }));
  };

  // ── Render ─────────────────────────────────────────────────────────
  // Teacher: trigger pill + composer modal + live tally panel
  // Student: vote modal when a poll is active
  if (userRole === "teacher") {
    return (
      <>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          disabled={!!activePoll}
          className="lk-button flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-40"
          title={t("pollTooltip")}
        >
          <BarChart3 className="size-4" />
          {t("poll")}
        </button>

        {activePoll && (
          <TallyOverlay
            poll={activePoll}
            counts={tallies[activePoll.id] ?? []}
            onEnd={endPoll}
          />
        )}

        {composerOpen && (
          <ComposerModal
            question={question}
            setQuestion={setQuestion}
            options={options}
            setOptions={setOptions}
            onSubmit={startPoll}
            onClose={() => setComposerOpen(false)}
          />
        )}
      </>
    );
  }

  // Student view: vote modal; if they've voted, show their pick + waiting.
  if (activePoll) {
    const myVote = studentVotes[activePoll.id];
    return <VoteModal poll={activePoll} myVote={myVote} onVote={vote} />;
  }

  // Student sees end-results briefly after poll closes (we keep it until
  // next poll since tallies only arrive on the teacher side in this v1).
  return null;
}

// ─── Subcomponents ─────────────────────────────────────────────────────

function ComposerModal({
  question,
  setQuestion,
  options,
  setOptions,
  onSubmit,
  onClose,
}: {
  question: string;
  setQuestion: (v: string) => void;
  options: string[];
  setOptions: (v: string[]) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("session");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t("pollCreate")}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          {t("pollQuestion")}
        </label>
        <input
          autoFocus
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[var(--ev-blue)] focus:outline-none"
          placeholder={t("pollQuestionPlaceholder")}
          maxLength={140}
        />
        <label className="mt-3 block text-sm font-medium text-slate-700">
          {t("pollOptions")}
        </label>
        <div className="mt-1 space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                className="flex-1 rounded-lg border border-slate-200 p-2 text-sm"
                placeholder={t("pollOptionPlaceholder", { num: i + 1 })}
                maxLength={80}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 4 && (
          <button
            type="button"
            onClick={() => setOptions([...options, ""])}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--ev-blue)] hover:underline"
          >
            <Plus className="size-3" />
            {t("pollAddOption")}
          </button>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {t("cancelShort")}
          </button>
          <button
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ev-blue-light)]"
          >
            <Send className="size-3.5" />
            {t("pollStart")}
          </button>
        </div>
      </div>
    </div>
  );
}

function TallyOverlay({
  poll,
  counts,
  onEnd,
}: {
  poll: Poll;
  counts: number[];
  onEnd: () => void;
}) {
  const t = useTranslations("session");
  const total = counts.reduce((s, n) => s + n, 0);
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40 w-80">
      <div className="pointer-events-auto rounded-xl border border-[var(--ev-blue)]/40 bg-white p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="size-4 text-[var(--ev-blue)]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ev-blue)]">
              {t("pollLive")}
            </span>
            <span className="text-xs text-slate-500">({total})</span>
          </div>
          <button
            onClick={onEnd}
            className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
          >
            {t("pollEnd")}
          </button>
        </div>
        <p className="mb-3 text-sm font-semibold text-slate-900">{poll.question}</p>
        <div className="space-y-1.5">
          {poll.options.map((opt, i) => {
            const n = counts[i] ?? 0;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-slate-700">{opt}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {n} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-[var(--ev-blue)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VoteModal({
  poll,
  myVote,
  onVote,
}: {
  poll: Poll;
  myVote: number | undefined;
  onVote: (idx: number) => void;
}) {
  const t = useTranslations("session");
  const hasVoted = myVote !== undefined;
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2">
      <div className="pointer-events-auto rounded-xl border border-[var(--ev-amber)]/40 bg-white p-4 shadow-xl">
        <div className="mb-1 flex items-center gap-1.5">
          <BarChart3 className="size-4 text-[var(--ev-amber)]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ev-amber)]">
            {hasVoted ? t("pollVoteSent") : t("pollVotePrompt")}
          </span>
        </div>
        <p className="mb-3 text-sm font-semibold text-slate-900">{poll.question}</p>
        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const isMine = myVote === i;
            return (
              <button
                key={i}
                onClick={() => onVote(i)}
                disabled={hasVoted}
                className={`flex w-full items-center gap-2 rounded-lg border-2 p-2.5 text-left text-sm transition-all disabled:cursor-default ${
                  isMine
                    ? "border-[var(--ev-green)] bg-[var(--ev-green-50)] text-[var(--ev-green-dark)]"
                    : hasVoted
                    ? "border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 hover:border-[var(--ev-blue)] hover:bg-[var(--ev-blue-50)]"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    isMine
                      ? "border-[var(--ev-green)] bg-[var(--ev-green)] text-white"
                      : "border-slate-300"
                  }`}
                >
                  {isMine && <span className="text-[10px]">✓</span>}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {hasVoted && (
          <p className="mt-2 text-xs text-slate-500">{t("pollWaitingForResults")}</p>
        )}
      </div>
    </div>
  );
}
