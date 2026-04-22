"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline editor for a single platform_config row. Accepts any JSON-serializable
 * value; renders a number input when the current value is a number, text input
 * otherwise. Saves via POST /api/admin/platform-config.
 */
export function PlatformConfigRow({
  configKey,
  label,
  description,
  initialValue,
}: {
  configKey: string;
  label: string;
  description: string | null;
  initialValue: unknown;
}) {
  const isNumber = typeof initialValue === "number";
  const [draft, setDraft] = useState<string>(String(initialValue ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    setOk(false);
    let parsed: unknown;
    if (isNumber) {
      const n = Number(draft);
      if (Number.isNaN(n)) {
        setError("Nombre invalide");
        return;
      }
      parsed = n;
    } else {
      try {
        parsed = JSON.parse(draft);
      } catch {
        parsed = draft;
      }
    }
    start(async () => {
      const res = await fetch("/api/admin/platform-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configKey, value: parsed }),
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
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:gap-4">
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {description && (
          <div className="text-xs text-slate-500">{description}</div>
        )}
        <div className="mt-1 text-xs text-slate-400">
          Clé: <code>{configKey}</code>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type={isNumber ? "number" : "text"}
          step={isNumber ? "0.01" : undefined}
          min={isNumber ? 0 : undefined}
          max={isNumber ? 1 : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
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
    </div>
  );
}
