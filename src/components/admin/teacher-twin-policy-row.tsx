"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Tier = "none" | "qa" | "full";

/**
 * Per-teacher twin policy editor. Autosaves on every change (tier dropdown,
 * checkbox, price blur) so the table doesn't carry one "Enregistrer"
 * button per row. A shared status pill flashes inline after each save.
 */
export function TeacherTwinPolicyRow({
  teacherId,
  initialTier,
  initialVoiceConsent,
  initialFullConsent,
  initialPriceRatio,
}: {
  teacherId: string;
  initialTier: Tier;
  initialVoiceConsent: string | null;
  initialFullConsent: string | null;
  initialPriceRatio: number | null;
}) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const [voice, setVoice] = useState<boolean>(Boolean(initialVoiceConsent));
  const [full, setFull] = useState<boolean>(Boolean(initialFullConsent));
  const [priceInput, setPriceInput] = useState<string>(
    initialPriceRatio == null ? "" : String(initialPriceRatio)
  );
  const [priceCommitted, setPriceCommitted] = useState<string>(
    initialPriceRatio == null ? "" : String(initialPriceRatio)
  );
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  function persist(patch: Record<string, unknown>) {
    setError(null);
    setStatus("saving");
    start(async () => {
      const res = await fetch("/api/admin/teacher-twin-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, ...patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setStatus("error");
        setError(j.error ?? "Échec");
        return;
      }
      setStatus("ok");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    });
  }

  function onTierChange(next: Tier) {
    setTier(next);
    persist({ twin_tier: next });
  }
  function onVoiceChange(next: boolean) {
    setVoice(next);
    persist({ twin_voice_consent_at: next ? new Date().toISOString() : null });
  }
  function onFullChange(next: boolean) {
    setFull(next);
    persist({ twin_full_session_consent_at: next ? new Date().toISOString() : null });
  }
  function onPriceBlur() {
    if (priceInput === priceCommitted) return;
    const trimmed = priceInput.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (Number.isNaN(value) || value < 0 || value > 1)) {
      setStatus("error");
      setError("0–1");
      setPriceInput(priceCommitted);
      return;
    }
    setPriceCommitted(priceInput);
    persist({ twin_price_ratio: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={tier}
        onChange={(e) => onTierChange(e.target.value as Tier)}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
      >
        <option value="none">Aucun jumeau</option>
        <option value="qa">Jumeau Q&amp;R uniquement</option>
        <option value="full">Jumeau complet</option>
      </select>

      <label className="inline-flex items-center gap-1 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={voice}
          onChange={(e) => onVoiceChange(e.target.checked)}
        />
        Consent. voix
      </label>

      <label className="inline-flex items-center gap-1 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={full}
          onChange={(e) => onFullChange(e.target.checked)}
        />
        Consent. séance complète
      </label>

      <input
        type="number"
        step="0.01"
        min={0}
        max={1}
        placeholder="défaut"
        value={priceInput}
        onChange={(e) => setPriceInput(e.target.value)}
        onBlur={onPriceBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
        title="Ratio du tarif live (ex: 0.35). Laisser vide pour utiliser la valeur plateforme."
      />

      <span className="inline-block min-w-[5rem] text-xs" aria-live="polite">
        {status === "saving" && <span className="text-slate-400">…</span>}
        {status === "ok" && <span className="text-emerald-600">✓</span>}
        {status === "error" && (
          <span className="text-rose-500">{error ?? "échec"}</span>
        )}
      </span>
    </div>
  );
}
