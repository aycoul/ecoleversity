"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

interface RefundItem {
  id: string;
  reason: string | null;
  requested_amount_xof: number;
  approved_amount_xof: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  transaction: {
    id: string;
    amount_xof: number;
    payment_reference: string | null;
  } | null;
  parent: {
    display_name: string | null;
    email: string | null;
  } | null;
  live_class: {
    title: string | null;
    scheduled_at: string | null;
  } | null;
}

function normalizeRefund(raw: unknown): RefundItem {
  const r = raw as Record<string, unknown>;
  const tx = Array.isArray(r.transaction) ? r.transaction[0] : r.transaction;
  const parent = Array.isArray(r.parent) ? r.parent[0] : r.parent;
  const liveClass = Array.isArray(r.live_class) ? r.live_class[0] : r.live_class;
  return {
    id: r.id as string,
    reason: r.reason as string | null,
    requested_amount_xof: r.requested_amount_xof as number,
    approved_amount_xof: r.approved_amount_xof as number | null,
    status: r.status as string,
    admin_notes: r.admin_notes as string | null,
    created_at: r.created_at as string,
    processed_at: r.processed_at as string | null,
    transaction: tx as RefundItem["transaction"],
    parent: parent as RefundItem["parent"],
    live_class: liveClass as RefundItem["live_class"],
  };
}

interface RefundProcessorProps {
  initialRefunds: unknown[];
}

export function RefundProcessor({ initialRefunds }: RefundProcessorProps) {
  const [refunds, setRefunds] = useState<RefundItem[]>(initialRefunds.map(normalizeRefund));
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function processRefund(id: string, action: "approve" | "deny" | "partial") {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNotes: notes[id] || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        setProcessingId(null);
        return;
      }

      toast.success(
        action === "approve"
          ? "Remboursement approuvé"
          : action === "deny"
          ? "Remboursement refusé"
          : "Remboursement partiel approuvé"
      );

      setRefunds((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: data.status,
                approved_amount_xof: data.amount,
                processed_at: new Date().toISOString(),
              }
            : r
        )
      );
    } catch {
      toast.error("Erreur de traitement");
    } finally {
      setProcessingId(null);
    }
  }

  const pending = refunds.filter((r) => r.status === "pending");
  const processed = refunds.filter((r) => r.status !== "pending");

  if (refunds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
        <AlertCircle className="mx-auto mb-3 size-10 text-slate-300" />
        <p className="text-sm text-slate-500">Aucune demande de remboursement</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            En attente ({pending.length})
          </h2>
          {pending.map((r) => (
            <RefundCard
              key={r.id}
              refund={r}
              processing={processingId === r.id}
              note={notes[r.id] ?? ""}
              onNoteChange={(v) => setNotes((prev) => ({ ...prev, [r.id]: v }))}
              onProcess={processRefund}
            />
          ))}
        </div>
      )}

      {processed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Traité ({processed.length})
          </h2>
          {processed.map((r) => (
            <RefundCard
              key={r.id}
              refund={r}
              processing={false}
              note=""
              onNoteChange={() => {}}
              onProcess={() => {}}
              readOnly
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RefundCard({
  refund,
  processing,
  note,
  onNoteChange,
  onProcess,
  readOnly = false,
}: {
  refund: RefundItem;
  processing: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onProcess: (id: string, action: "approve" | "deny" | "partial") => void;
  readOnly?: boolean;
}) {
  const txAmount = refund.transaction?.amount_xof ?? 0;
  const rate = txAmount > 0 ? Math.round(((refund.requested_amount_xof / txAmount) * 100)) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                refund.status === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : refund.status === "approved" || refund.status === "partial"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {refund.status === "pending" && "En attente"}
              {refund.status === "approved" && "Approuvé"}
              {refund.status === "partial" && "Partiel"}
              {refund.status === "denied" && "Refusé"}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(refund.created_at).toLocaleDateString("fr-CI")}
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-900">
            {refund.parent?.display_name ?? refund.parent?.email ?? "Parent"}
            {" · "}
            {(refund.requested_amount_xof).toLocaleString("fr-CI")} FCFA
            {rate > 0 && rate < 100 && (
              <span className="ml-1 text-xs font-normal text-slate-500">({rate}%)</span>
            )}
          </p>

          {refund.live_class?.title && (
            <p className="text-xs text-slate-500">
              {refund.live_class.title}
              {refund.live_class.scheduled_at && (
                <>
                  {" · "}
                  {new Date(refund.live_class.scheduled_at).toLocaleDateString("fr-CI", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </p>
          )}

          {refund.reason && (
            <p className="text-xs text-slate-600 italic">&ldquo;{refund.reason}&rdquo;</p>
          )}

          {refund.admin_notes && (
            <p className="text-xs text-slate-500">
              Note admin: {refund.admin_notes}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex flex-col gap-2 sm:items-end">
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Note admin (optionnel)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs sm:w-64"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onProcess(refund.id, "deny")}
                disabled={processing}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="size-3" />
                Refuser
              </button>
              <button
                onClick={() => onProcess(refund.id, "approve")}
                disabled={processing}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <CheckCircle className="size-3" />
                )}
                Approuver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
