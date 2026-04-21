"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2 } from "lucide-react";

/**
 * One-tap exit from kid mode. Hits the same /api/profile/switch endpoint
 * the AvatarSwitcher dropdown uses, but without requiring the parent to
 * discover + open the dropdown first. Shown in the sidebar footer of
 * DashboardShell whenever the user is inside a learner context
 * (activeLearnerId != null).
 */
export function SwitchToParentButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learner_id: null }),
      });
      if (!res.ok) throw new Error("switch_failed");
      router.push("/dashboard/parent/overview");
      router.refresh();
    } catch {
      toast.error("Impossible de revenir en mode parent");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="flex w-full items-center gap-2 rounded-lg bg-[var(--ev-blue-50)] px-3 py-2 text-sm font-semibold text-[var(--ev-blue)] transition-colors hover:bg-[var(--ev-blue)]/10 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ArrowLeftRight className="size-4" />
      )}
      <span>Retour en mode parent</span>
    </button>
  );
}
