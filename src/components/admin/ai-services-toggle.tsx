"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Switch that flips profiles.ai_services_enabled for a single account.
 * Optimistic UI — we set local state immediately and fall back on server
 * error. Router refresh after success so the row's class updates.
 */
export function AiServicesToggle({
  userId,
  initialEnabled,
}: {
  userId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/ai-services-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, enabled: next }),
      });
      if (!res.ok) {
        setEnabled(!next);
        setError("Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={enabled}
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          enabled ? "bg-[var(--ev-green)]" : "bg-slate-300",
          pending ? "opacity-60" : "",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block size-5 transform rounded-full bg-white transition-transform",
            enabled ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </button>
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
