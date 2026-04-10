"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/exam";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Question = {
  id: string;
  question_text: string;
  options: string[];
  difficulty: string;
};

type Result = {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  explanation: string | null;
};

type PracticeTestProps = {
  examType: string;
  subject: string;
  learnerId: string;
  timeLimitMinutes?: number;
};

export function PracticeTest({
  examType,
  subject,
  learnerId,
  timeLimitMinutes = 15,
}: PracticeTestProps) {
  const t = useTranslations("exam");

  const [phase, setPhase] = useState<"loading" | "test" | "submitting" | "results">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    percentage: number;
    results: Result[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeLimit = timeLimitMinutes * 60;

  // Fetch questions
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exams/questions?examType=${examType}&subject=${subject}&limit=20`);
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setQuestions(json.data);
          setPhase("test");
        } else {
          setError(t("noQuestions"));
        }
      } catch {
        setError(t("loadError"));
      }
    }
    load();
  }, [examType, subject, t]);

  // Timer
  useEffect(() => {
    if (phase !== "test") return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= timeLimit) {
          handleSubmit();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeLimit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((questionId: string, optionIndex: number) => {
    setAnswers((prev) => new Map(prev).set(questionId, optionIndex));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (phase === "submitting") return;
    setPhase("submitting");

    const questionIds = questions.map((q) => q.id);
    const answerList = questionIds.map((id) => answers.get(id) ?? -1);

    try {
      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerId,
          examType,
          subject,
          questionIds,
          answers: answerList,
          durationSeconds: elapsed,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setResults(json.data);
        setPhase("results");
      } else {
        setError(json.error ?? t("submitError"));
        setPhase("test");
      }
    } catch {
      setError(t("submitError"));
      setPhase("test");
    }
  }, [phase, questions, answers, learnerId, examType, subject, elapsed, t]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-[var(--ev-blue)]" />
      </div>
    );
  }

  // Results view
  if (phase === "results" && results) {
    return (
      <div className="space-y-6">
        {/* Score header */}
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <p className="text-5xl font-extrabold text-[var(--ev-blue)]">
            {results.percentage}%
          </p>
          <p className="mt-2 text-slate-600">
            {t("scoreMessage", { score: results.score, total: results.total })}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t("duration")}: {formatDuration(elapsed)}
          </p>
        </div>

        {/* Question review */}
        <div className="space-y-4">
          {questions.map((q, i) => {
            const r = results.results[i];
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-4 ${
                  r?.isCorrect
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {r?.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {i + 1}. {q.question_text}
                    </p>
                    {r && !r.isCorrect && (
                      <p className="mt-1 text-xs text-slate-600">
                        {t("correctAnswer")}: {q.options[r.correct]}
                      </p>
                    )}
                    {r?.explanation && (
                      <p className="mt-1 text-xs text-slate-500 italic">
                        {r.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="w-full bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
        >
          <RotateCcw className="mr-2 size-4" />
          {t("retryTest")}
        </Button>
      </div>
    );
  }

  // Test view
  const currentQ = questions[currentIndex];
  const selectedAnswer = answers.get(currentQ?.id ?? "");
  const answeredCount = answers.size;
  const remaining = timeLimit - elapsed;

  return (
    <div className="space-y-6">
      {/* Progress + Timer bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          {t("questionOf", { current: currentIndex + 1, total: questions.length })}
        </span>
        <div className={`flex items-center gap-1.5 text-sm font-mono ${
          remaining < 60 ? "text-red-600" : "text-slate-600"
        }`}>
          <Clock className="size-4" />
          {formatDuration(remaining)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[var(--ev-green)] transition-all"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      {currentQ && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {currentQ.question_text}
          </h3>

          <div className="space-y-2">
            {currentQ.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(currentQ.id, i)}
                className={`w-full rounded-xl border-2 p-4 text-left text-sm transition-all ${
                  selectedAnswer === i
                    ? "border-[var(--ev-blue)] bg-[var(--ev-blue-50)] text-[var(--ev-blue)]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="mr-3 inline-flex size-6 items-center justify-center rounded-full border text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 size-4" />
          {t("previous")}
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
          >
            {t("next")}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={phase === "submitting"}
            className="bg-[var(--ev-green)] hover:bg-[var(--ev-green-light)]"
          >
            {phase === "submitting" && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submitTest")} ({answeredCount}/{questions.length})
          </Button>
        )}
      </div>
    </div>
  );
}
