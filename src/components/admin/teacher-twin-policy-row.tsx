"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Tier = "none" | "qa" | "full";

/**
 * Per-teacher twin policy editor. Admin sets tier + records voice/full-session
 * consent + overrides price ratio. All changes flow through POST
 * /api/admin/teacher-twin-policy with optimistic UI.
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
  const [price, setPrice] = useState<string>(
    initialPriceRatio == null ? "" : String(initialPriceRatio)
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    setOk(false);
    const body: Record<string, unknown> = { teacherId };
    body.twin_tier = tier;
    body.twin_voice_consent_at = voice ? new Date().toISOString() : null;
    body.twin_full_session_consent_at = full ? new Date().toISOString() : null;
    body.twin_price_ratio = price.trim() === "" ? null : Number(price);

    start(async () => {
      const res = await fetch("/api/admin/teacher-twin-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Échec");
        return;
      }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value as Tier)}
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
          onChange={(e) => setVoice(e.target.checked)}
        />
        Consent. voix
      </label>

      <label className="inline-flex items-center gap-1 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={full}
          onChange={(e) => setFull(e.target.checked)}
        />
        Consent. séance complète
      </label>

      <input
        type="number"
        step="0.01"
        min={0}
        max={1}
        placeholder="défaut"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
        title="Ratio du tarif live (ex: 0.35). Laisser vide pour utiliser la valeur plateforme."
      />

      <button
        onClick={save}
        disabled={pending}
        className="rounded-md bg-[var(--ev-blue)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--ev-blue-light)] disabled:opacity-60"
      >
        {pending ? "…" : "Enregistrer"}
      </button>
      {ok && <span className="text-xs text-emerald-600">✓</span>}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
