"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_PROVIDERS, PAYMENT_PROVIDER_LABELS } from "@/types/domain";
import type { PaymentProvider } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet } from "lucide-react";

type PayoutStepProps = {
  onSaved: () => void;
};

export function PayoutStep({ onSaved }: PayoutStepProps) {
  const t = useTranslations("onboarding.teacher");

  const [provider, setProvider] = useState<PaymentProvider | "">("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!provider || !phone.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("teacher_profiles")
        .update({
          payout_provider: provider,
          payout_phone: phone.trim(),
        })
        .eq("user_id", user.id);
      if (error) throw error;

      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("payoutTitle")}</h2>
        <p className="text-sm text-slate-500">{t("payoutDesc")}</p>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
        <Wallet className="size-8 text-emerald-600" />
        <p className="text-sm text-emerald-700">
          Vous recevrez vos paiements chaque semaine sur ce num&eacute;ro
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("payoutProvider")}</Label>
          <Select value={provider} onValueChange={(val) => setProvider(val as PaymentProvider)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un op\u00e9rateur" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PAYMENT_PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payout-phone">{t("payoutPhone")}</Label>
          <Input
            id="payout-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07 XX XX XX XX"
          />
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving || !provider || !phone.trim()}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Enregistrer et continuer
      </Button>
    </div>
  );
}
