"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCOPE_LABELS_FR } from "@/lib/admin/scopes";
import type { AdminScope } from "@/lib/admin/scopes";
import { ShieldPlus, Trash2, Loader2 } from "lucide-react";

export type AdminRow = {
  id: string;
  displayName: string | null;
  email: string;
  adminScope: string | null;
  createdAt: string;
  isSelf: boolean;
};

const SCOPE_OPTIONS: AdminScope[] = [
  "founder",
  "finance",
  "moderation",
  "verification",
  "support",
  "analytics_viewer",
  "school_admin",
];

export function AdminManagement({
  initialAdmins,
}: {
  initialAdmins: AdminRow[];
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<AdminScope>("moderation");
  const [adding, startAdd] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function grant() {
    if (!email.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    startAdd(async () => {
      const res = await fetch("/api/admin/admins/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), scope }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Échec de la promotion");
        return;
      }
      setAdmins((prev) => [
        ...prev.filter((a) => a.id !== json.targetId),
        {
          id: json.targetId,
          displayName: json.displayName ?? null,
          email: json.email ?? email,
          adminScope: scope,
          createdAt: new Date().toISOString(),
          isSelf: false,
        },
      ]);
      setEmail("");
      toast.success(`${json.email} est maintenant ${SCOPE_LABELS_FR[scope]}`);
    });
  }

  async function revoke(row: AdminRow) {
    if (row.isSelf) {
      toast.error("Vous ne pouvez pas vous rétrograder");
      return;
    }
    if (row.adminScope === "founder") {
      toast.error("Demandez à ce fondateur de se révoquer lui-même");
      return;
    }
    if (!window.confirm(`Révoquer l'accès admin de ${row.email} ?`)) return;
    setUpdatingId(row.id);
    const res = await fetch("/api/admin/admins/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: row.id }),
    });
    setUpdatingId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? "Échec");
      return;
    }
    setAdmins((prev) => prev.filter((a) => a.id !== row.id));
    toast.success(`${row.email} n'est plus admin`);
  }

  async function changeScope(row: AdminRow, next: AdminScope) {
    if (row.isSelf) {
      toast.error("Vous ne pouvez pas changer votre propre scope");
      return;
    }
    if (next === row.adminScope) return;
    setUpdatingId(row.id);
    const res = await fetch("/api/admin/admins/scope", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: row.id, scope: next }),
    });
    setUpdatingId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? "Échec");
      return;
    }
    setAdmins((prev) =>
      prev.map((a) => (a.id === row.id ? { ...a, adminScope: next } : a))
    );
    toast.success(`Scope mis à jour : ${SCOPE_LABELS_FR[next]}`);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--ev-blue)]/20 bg-[var(--ev-blue-50)]/30 p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Inviter un collaborateur
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Le collaborateur doit déjà avoir un compte (n&apos;importe quel email
          ayant fait l&apos;inscription). Saisissez son email puis choisissez son
          niveau d&apos;accès.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1">
            <Label htmlFor="grant-email">Email</Label>
            <Input
              id="grant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@exemple.com"
              disabled={adding}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="grant-scope">Niveau d&apos;accès</Label>
            <select
              id="grant-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as AdminScope)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              disabled={adding}
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS_FR[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={grant}
              disabled={adding || !email}
              className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
            >
              {adding ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldPlus className="mr-2 size-4" />
              )}
              Inviter
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Administrateurs actuels ({admins.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Nom</th>
                <th className="p-3 text-left font-semibold text-slate-700">Email</th>
                <th className="p-3 text-left font-semibold text-slate-700">Scope</th>
                <th className="p-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-3">
                    {a.displayName ?? "—"}
                    {a.isSelf && (
                      <span className="ml-2 rounded-full bg-[var(--ev-amber-50)] px-2 py-0.5 text-xs text-[var(--ev-amber-dark)]">
                        vous
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500">{a.email}</td>
                  <td className="p-3">
                    <select
                      value={a.adminScope ?? "moderation"}
                      onChange={(e) => changeScope(a, e.target.value as AdminScope)}
                      disabled={a.isSelf || updatingId === a.id}
                      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs disabled:bg-slate-50"
                    >
                      {SCOPE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {SCOPE_LABELS_FR[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke(a)}
                      disabled={a.isSelf || a.adminScope === "founder" || updatingId === a.id}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      {updatingId === a.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Aucun admin pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
