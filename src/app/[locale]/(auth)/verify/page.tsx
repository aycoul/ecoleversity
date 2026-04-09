"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function VerifyPage() {
  const t = useTranslations("auth");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Placeholder — will be wired up when phone OTP is needed
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[var(--ev-green)]/10">
          <ShieldCheck className="size-6 text-[var(--ev-blue)]" />
        </div>
        <CardTitle className="text-xl">{t("otpEnter")}</CardTitle>
        <CardDescription>
          {t("otpSent", { destination: "***" })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-code">{t("otpEnter")}</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-2xl tracking-[0.5em]"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
            disabled={code.length !== 6 || loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("otpEnter")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-[var(--ev-blue)]"
            disabled={loading}
          >
            {t("otpResend")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
