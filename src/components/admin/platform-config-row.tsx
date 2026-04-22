"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline editor for a single platform_config row. Autosaves on blur (and
 * on Enter): avoids stacking six "Enregistrer" buttons down the page.
 * A brief ✓ / × status flashes inline so the admin sees the outcome.
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
  const [committed, setCommitted] = useState<string>(String(initialValue ?? ""));
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  function save() {
    if (draft === committed) return;
    setError(null);
    let parsed: unknown;
    if (isNumber) {
      const n = Number(draft);
      if (Number.isNaN(n)) {
        setStatus("error");
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
    setStatus("saving");
    start(async () => {
      const res = await fetch("/api/admin/platform-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configKey, value: parsed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setStatus("error");
        setError(j.error ?? "Échec");
        setDraft(committed);
        return;
      }
      setCommitted(draft);
      setStatus("ok");
      router.refresh();
      // Let the ✓ sit for a moment, then drop back to idle.
      setTimeout(() => setStatus("idle"), 1500);
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
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <span className="inline-block w-16 text-xs" aria-live="polite">
          {status === "saving" && <span className="text-slate-400">…</span>}
          {status === "ok" && <span className="text-emerald-600">✓ enregistré</span>}
          {status === "error" && (
            <span className="text-rose-500">{error ?? "échec"}</span>
          )}
        </span>
      </div>
    </div>
  );
}
