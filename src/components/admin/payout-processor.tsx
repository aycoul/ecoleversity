"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Phone, Smartphone, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { normalizeCIPhone, formatCIPhone } from "@/lib/phone";

// Payout providers are a superset of incoming PaymentProvider — adds
// 'wallet' (platform-internal credit) and 'manual' (founder pays
// outside the platform and just records the fact). Keep the list and
// labels in sync with /api/teacher/payout-info and
// /api/admin/teacher-payout-info.
type PayoutProviderKey = "orange_money" | "wave" | "mtn_momo" | "wallet" | "manual";

const PAYOUT_PROVIDERS: PayoutProviderKey[] = [
  "orange_money",
  "wave",
  "mtn_momo",
  "wallet",
  "manual",
];

const PAYOUT_PROVIDER_LABELS: Record<PayoutProviderKey, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN MoMo",
  wallet: "Portefeuille EcoleVersity",
  manual: "Manuel (hors plateforme)",
};

export type PendingPayout = {
  payoutId: string;
  amountXof: number;
  payoutPhone: string;
  provider: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
};

export type TeacherPayoutItem = {
  teacherId: string;
  teacherName: string;
  /** Live values from teacher_profiles (admin override target). */
  profilePayoutPhone: string | null;
  profilePayoutProvider: string | null;
  /** Amount currently unsettled — earned minus completed AND pending. */
  newPayoutAmount: number;
  /** Existing pending teacher_payouts rows (from teacher requests). */
  pendingPayouts: PendingPayout[];
};

export function PayoutProcessor({ items }: { items: TeacherPayoutItem[] }) {
  const t = useTranslations("payout");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function confirmExisting(p: PendingPayout) {
    setBusy(`existing:${p.payoutId}`);
    const res = await fetch("/api/admin/process-existing-payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId: p.payoutId }),
    });
    setBusy(null);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error ?? "Échec");
      return;
    }
    toast.success(t("paid"));
    router.refresh();
  }

  async function processNew(item: TeacherPayoutItem) {
    if (!item.profilePayoutPhone || !item.profilePayoutProvider) {
      toast.error("Renseignez d'abord les coordonnées de paiement");
      return;
    }
    setBusy(`new:${item.teacherId}`);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = now.toISOString();
    const res = await fetch("/api/admin/process-payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: item.teacherId,
        amountXof: item.newPayoutAmount,
        periodStart,
        periodEnd,
      }),
    });
    setBusy(null);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error ?? "Échec");
      return;
    }
    toast.success(t("paid"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <TeacherCard
          key={item.teacherId}
          item={item}
          busy={busy}
          onConfirmExisting={confirmExisting}
          onProcessNew={processNew}
          onRefresh={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function TeacherCard({
  item,
  busy,
  onConfirmExisting,
  onProcessNew,
  onRefresh,
}: {
  item: TeacherPayoutItem;
  busy: string | null;
  onConfirmExisting: (p: PendingPayout) => void;
  onProcessNew: (item: TeacherPayoutItem) => void;
  onRefresh: () => void;
}) {
  const hasInfo = !!item.profilePayoutPhone && !!item.profilePayoutProvider;
  const providerLabel = item.profilePayoutProvider
    ? PAYOUT_PROVIDER_LABELS[item.profilePayoutProvider as PayoutProviderKey] ??
      item.profilePayoutProvider
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{item.teacherName}</p>
          {hasInfo ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {formatCIPhone(item.profilePayoutPhone)}
              </span>
              <span className="flex items-center gap-1">
                <Smartphone className="size-3" />
                {providerLabel}
              </span>
            </div>
          ) : (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="size-3" />
              Coordonnées de paiement manquantes
            </div>
          )}
        </div>
      </div>

      {!hasInfo && (
        <PayoutInfoForm teacherId={item.teacherId} onSaved={onRefresh} />
      )}

      {item.pendingPayouts.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demandes en attente
          </p>
          {item.pendingPayouts.map((p) => {
            const periodStart = new Date(p.periodStart).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            });
            const periodEnd = new Date(p.periodEnd).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const isBusy = busy === `existing:${p.payoutId}`;
            return (
              <div
                key={p.payoutId}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="text-xs text-slate-600">
                  <p className="font-medium text-slate-800">
                    {formatCurrency(p.amountXof)}
                  </p>
                  <p>
                    {periodStart} → {periodEnd} · {p.payoutPhone} · {PAYOUT_PROVIDER_LABELS[p.provider as PayoutProviderKey] ?? p.provider}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onConfirmExisting(p)}
                  disabled={isBusy}
                  className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
                >
                  {isBusy ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 size-3" />
                  )}
                  Confirmer
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {item.newPayoutAmount > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[var(--ev-blue)]/20 bg-[var(--ev-blue-50)]/40 p-3">
          <div className="text-xs text-slate-600">
            <p className="font-medium text-slate-800">
              Solde non versé : {formatCurrency(item.newPayoutAmount)}
            </p>
            <p>Crée un nouveau versement pour le mois en cours.</p>
          </div>
          <Button
            size="sm"
            onClick={() => onProcessNew(item)}
            disabled={!hasInfo || busy === `new:${item.teacherId}`}
            className="bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
          >
            {busy === `new:${item.teacherId}` ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : null}
            Marquer payé
          </Button>
        </div>
      )}
    </div>
  );
}

function PayoutInfoForm({
  teacherId,
  onSaved,
}: {
  teacherId: string;
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<PayoutProviderKey>("orange_money");
  const [saving, setSaving] = useState(false);

  async function save() {
    const normalized = normalizeCIPhone(phone);
    if (!normalized) {
      toast.error(
        "Numéro Côte d'Ivoire invalide. Tapez 10 chiffres (avec ou sans +225, espaces et tirets sont OK)."
      );
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/teacher-payout-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        payout_phone: normalized,
        payout_provider: provider,
      }),
    });
    setSaving(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error ?? "Échec");
      return;
    }
    toast.success("Coordonnées enregistrées");
    onSaved();
  }

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-1">
        <Label htmlFor={`phone-${teacherId}`} className="text-xs">
          Téléphone (CI)
        </Label>
        <Input
          id={`phone-${teacherId}`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => {
            const n = normalizeCIPhone(phone);
            if (n) setPhone(formatCIPhone(n));
          }}
          placeholder="07 01 02 03 04"
          disabled={saving}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`provider-${teacherId}`} className="text-xs">
          Moyen de paiement
        </Label>
        <select
          id={`provider-${teacherId}`}
          value={provider}
          onChange={(e) => setProvider(e.target.value as PayoutProviderKey)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          disabled={saving}
        >
          {PAYOUT_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PAYOUT_PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
