"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";

interface SaveClassButtonProps {
  classId: string;
  initialSaved?: boolean;
  size?: "sm" | "md";
}

export function SaveClassButton({
  classId,
  initialSaved = false,
  size = "md",
}: SaveClassButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  // Sync with external prop changes
  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (saved) {
        const res = await fetch(`/api/classes/save?classId=${classId}`, {
          method: "DELETE",
        });
        if (res.ok) setSaved(false);
      } else {
        const res = await fetch("/api/classes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId }),
        });
        if (res.ok) setSaved(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses = size === "sm" ? "size-7" : "size-9";
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full border transition-all ${
        saved
          ? "border-[var(--ev-amber)] bg-[var(--ev-amber)]/10 text-[var(--ev-amber)]"
          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
      } ${sizeClasses} ${loading ? "opacity-50" : ""}`}
      aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Bookmark className={`${iconSize} ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
