"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle, BadgeCheck } from "lucide-react";

interface FeaturedItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  start_date: string;
  end_date: string;
  amount_paid_xof: number;
  placement: string;
  active: boolean;
  is_current: boolean;
}

interface FeaturedTeacherManagerProps {
  initialItems: FeaturedItem[];
}

export function FeaturedTeacherManager({ initialItems }: FeaturedTeacherManagerProps) {
  const [items, setItems] = useState<FeaturedItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("5000");
  const [placement, setPlacement] = useState("both");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/featured-teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          startDate,
          endDate,
          amountPaidXof: Number(amount),
          placement,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        setLoading(false);
        return;
      }

      toast.success("Enseignant ajouté en vedette");
      setItems((prev) => [data.item, ...prev]);
      setShowForm(false);
      setTeacherId("");
      setStartDate("");
      setEndDate("");
      setAmount("5000");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/featured-teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });

      if (!res.ok) {
        toast.error("Erreur");
        return;
      }

      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, active: !current } : i))
      );
      toast.success(current ? "Désactivé" : "Activé");
    } catch {
      toast.error("Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm((s) => !s)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ev-blue-light)]"
      >
        <Plus className="size-4" />
        Ajouter un enseignant
      </button>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ID Enseignant (UUID)
              </label>
              <input
                type="text"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
                placeholder="uuid..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Montant payé (FCFA)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step={500}
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Placement
              </label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
              >
                <option value="homepage">Accueil</option>
                <option value="marketplace">Marketplace</option>
                <option value="both">Les deux</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ev-blue-light)] disabled:opacity-50"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Ajouter
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <BadgeCheck className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">Aucun enseignant en vedette</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm ${
                item.is_current
                  ? "border-[var(--ev-amber)]/30"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.teacher_name}
                  </span>
                  {item.is_current && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--ev-amber)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ev-amber)]">
                      <CheckCircle className="size-3" />
                      Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {item.start_date} → {item.end_date} · {item.amount_paid_xof.toLocaleString("fr-CI")} FCFA · {item.placement}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(item.id, item.active)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    item.active
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {item.active ? "Actif" : "Inactif"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
