"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/domain";
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
import { GraduationCap, Loader2, Users, Phone, Mail } from "lucide-react";

const registerSchema = z.object({
  displayName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

type RegisterFormProps = {
  initialRole?: "parent" | "teacher";
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function RegisterForm({ initialRole }: RegisterFormProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<"role" | "form">(
    initialRole ? "form" : "role"
  );
  const [role, setRole] = useState<"parent" | "teacher">(
    initialRole ?? "parent"
  );
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [countryCode, setCountryCode] = useState("+225");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectRole = (selected: "parent" | "teacher") => {
    setRole(selected);
    setStep("form");
  };

  const validate = () => {
    const result = registerSchema.safeParse({ displayName, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handlePhoneRegister = async () => {
    if (!phone || phone.length < 8 || !displayName) {
      toast.error(locale === "fr" ? "Veuillez remplir tous les champs" : "Please fill all fields");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    const formattedPhone = phone.startsWith("+") ? phone : `${cc}${phone.replace(/\s/g, "")}`;

    if (!otpSent) {
      if (resendCooldown > 0) {
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: "whatsapp",
          data: { display_name: displayName, role, language: locale },
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        setOtpSent(true);
        setResendCooldown(30);
        toast.success(locale === "fr" ? "Code envoyé !" : "Code sent!");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success(tc("success"));
    router.push(role === "teacher" ? "/onboarding/teacher" : "/onboarding/parent");
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    const supabase = createClient();
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    const formattedPhone = phone.startsWith("+") ? phone : `${cc}${phone.replace(/\s/g, "")}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        channel: "whatsapp",
        data: { display_name: displayName, role, language: locale },
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setResendCooldown(30);
      toast.success(locale === "fr" ? "Code renvoyé !" : "Code resent!");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: role as UserRole,
          language: locale,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(tc("success"));

    if (role === "teacher") {
      router.push("/onboarding/teacher");
    } else {
      router.push("/onboarding/parent");
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    // Store role in httpOnly-like cookie before OAuth redirect (prevents URL tampering)
    document.cookie = `ev_register_role=${role};path=/;max-age=600;samesite=lax`;

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  // Step 1: Role selection
  if (step === "role") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("registerTitle")}</CardTitle>
          <CardDescription>{t("roleSelect")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <button
            onClick={() => selectRole("parent")}
            className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-[var(--ev-green)]/30 hover:bg-[var(--ev-green-50)]"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green)]/10">
              <Users className="size-6 text-[var(--ev-blue)]" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {t("roleParent")}
              </p>
              <p className="text-sm text-slate-500">
                {locale === "fr"
                  ? "Trouvez un enseignant pour votre enfant"
                  : "Find a teacher for your child"}
              </p>
            </div>
          </button>
          <button
            onClick={() => selectRole("teacher")}
            className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-[var(--ev-green)]/30 hover:bg-[var(--ev-green-50)]"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green)]/10">
              <GraduationCap className="size-6 text-[var(--ev-blue)]" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {t("roleTeacher")}
              </p>
              <p className="text-sm text-slate-500">
                {locale === "fr"
                  ? "Gagnez de l'argent en enseignant en ligne"
                  : "Earn money teaching online"}
              </p>
            </div>
          </button>
          <p className="mt-2 text-center text-sm text-slate-500">
            {t("hasAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--ev-blue)] hover:text-[var(--ev-blue)]"
            >
              {tc("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Registration form
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t("registerTitle")}</CardTitle>
        <CardDescription>
          {role === "parent" ? t("roleParent") : t("roleTeacher")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Method toggle */}
        <div className="mb-4 flex rounded-lg border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              method === "phone" ? "bg-[var(--ev-blue)] text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Phone className="size-4" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              method === "email" ? "bg-[var(--ev-blue)] text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="size-4" />
            Email
          </button>
        </div>

        {/* Phone registration */}
        {method === "phone" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regName">{t("displayName")}</Label>
              <Input
                id="regName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="regPhone">{t("phoneNumber")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="regPhoneCountryCode"
                      type="text"
                      inputMode="tel"
                      value={countryCode}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^+\d]/g, "");
                        setCountryCode(raw.startsWith("+") ? raw : `+${raw}`);
                      }}
                      maxLength={5}
                      className="w-20 text-center"
                      aria-label="Indicatif pays"
                    />
                    <Input id="regPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 XX XX XX XX" autoComplete="tel" />
                  </div>
                </div>
                <Button onClick={handlePhoneRegister} className="w-full bg-green-600 text-white hover:bg-green-700" disabled={loading || !displayName || !phone}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("sendOtp")}
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-slate-600">
                  {t("otpSentTo", { phone: phone.startsWith("+") ? phone : `${countryCode}${phone}` })}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="regOtp">{t("otpCode")}</Label>
                  <Input id="regOtp" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="text-center text-2xl tracking-[0.5em]" autoFocus />
                </div>
                <Button onClick={handlePhoneRegister} className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]" disabled={loading || otp.length < 6}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("verifyOtp")}
                </Button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="block w-full text-center text-xs text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? t("otpResendIn", { seconds: resendCooldown })
                    : t("otpResend")}
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setResendCooldown(0); }} className="block w-full text-center text-xs text-slate-400 hover:text-slate-600">
                  {t("changeNumber")}
                </button>
              </>
            )}
          </div>
        )}

        {/* Email registration */}
        {method === "email" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-invalid={!!errors.displayName}
              autoComplete="name"
              autoFocus
            />
            {errors.displayName && (
              <p className="text-xs text-red-500">{errors.displayName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("registerTitle")}
          </Button>

        </form>
        )}

        <div className="mt-4 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-slate-500">
              {locale === "fr" ? "ou" : "or"}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <GoogleIcon className="mr-2 size-4" />
          {t("googleLogin")}
        </Button>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--ev-blue)] hover:text-[var(--ev-blue)]"
          >
            {tc("login")}
          </Link>
        </p>

        {!initialRole && (
          <button
            onClick={() => setStep("role")}
            className="mt-2 block w-full text-center text-xs text-slate-400 hover:text-slate-600"
          >
            {tc("back")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
