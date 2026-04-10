"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Trash2, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  is_active: boolean;
};

export function CouponManager() {
  const t = useTranslations("coupon");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);
  const [maxUses, setMaxUses] = useState(50);
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((j) => setCoupons(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          discountPercent: discount,
          maxUses,
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });
      if (res.ok) {
        toast.success(t("created"));
        setShowForm(false);
        setCode("");
        // Refresh
        const refreshRes = await fetch("/api/coupons");
        const refreshJson = await refreshRes.json();
        setCoupons(refreshJson.data ?? []);
      } else {
        const json = await res.json();
        toast.error(json.error);
      }
    } finally {
      setCreating(false);
    }
  }, [code, discount, maxUses, expiresAt, t]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast.success(t("deleted"));
  }, [t]);

  const handleCopy = useCallback(async (couponCode: string, id: string) => {
    await navigator.clipboard.writeText(couponCode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (loading) {
    return <Loader2 className="mx-auto size-6 animate-spin text-[var(--ev-blue)]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{t("title")}</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="mr-1 size-4" />
          {t("create")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("codeLabel")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" />
            </div>
            <div>
              <Label>{t("discountLabel")}</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} min={5} max={100} />
            </div>
            <div>
              <Label>{t("maxUsesLabel")}</Label>
              <Input type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} min={1} />
            </div>
            <div>
              <Label>{t("expiresLabel")}</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating || !code || !expiresAt} className="bg-[var(--ev-blue)]">
            {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("createCoupon")}
          </Button>
        </div>
      )}

      {coupons.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("noCoupons")}</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${c.is_active ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
              <div className="flex items-center gap-3">
                <Tag className="size-5 text-[var(--ev-green)]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{c.code}</span>
                    <button onClick={() => handleCopy(c.code, c.id)}>
                      {copiedId === c.id ? <Check className="size-3 text-green-600" /> : <Copy className="size-3 text-slate-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    -{c.discount_percent}% · {c.current_uses}/{c.max_uses} {t("used")} · {t("expires")} {new Date(c.expires_at).toLocaleDateString("fr-CI")}
                  </p>
                </div>
              </div>
              {c.is_active && (
                <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
