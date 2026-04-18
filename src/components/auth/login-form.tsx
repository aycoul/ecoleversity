"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirect } from "@/lib/auth-redirect";
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
import { Loader2, Phone, Mail } from "lucide-react";

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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366" />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [countryCode, setCountryCode] = useState("+225");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Phone OTP login — delivered via WhatsApp by our Send SMS Hook (AILead)
  const handleSendOtp = async () => {
    if (!phone || phone.length < 8) {
      toast.error(t("invalidPhone"));
      return;
    }
    if (resendCooldown > 0) return;

    setLoading(true);
    const supabase = createClient();

    // Format phone: add +225 if not present (CI country code)
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    const formattedPhone = phone.startsWith("+") ? phone : `${cc}${phone.replace(/\s/g, "")}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { channel: "whatsapp" },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setOtpSent(true);
      setResendCooldown(30);
      toast.success(t("otpSent"));
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) return;

    setLoading(true);
    const supabase = createClient();
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    const formattedPhone = phone.startsWith("+") ? phone : `${cc}${phone.replace(/\s/g, "")}`;

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

    const { path } = await getAuthRedirect(supabase);
    router.push(path);
  };

  // Email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const { path } = await getAuthRedirect(supabase);
    router.push(path);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-100 shadow-lg shadow-[var(--ev-blue)]/5">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-[var(--ev-blue)]">{t("loginTitle")}</CardTitle>
        <CardDescription>
          {locale === "fr" ? "Accédez à votre espace" : "Access your account"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method toggle */}
        <div className="flex rounded-lg border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              method === "phone"
                ? "bg-[var(--ev-blue)] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Phone className="size-4" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              method === "email"
                ? "bg-[var(--ev-blue)] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="size-4" />
            Email
          </button>
        </div>

        {/* Phone OTP form */}
        {method === "phone" && (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phoneCountryCode"
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
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07 XX XX XX XX"
                      autoComplete="tel"
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendOtp}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  disabled={loading || !phone}
                >
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <WhatsAppIcon className="mr-2 size-4" />
                  )}
                  {t("sendOtp")}
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-slate-600">
                  {t("otpSentTo", { phone: phone.startsWith("+") ? phone : `${countryCode}${phone}` })}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otp">{t("otpCode")}</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em]"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
                  disabled={loading || otp.length < 6}
                >
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("verifyOtp")}
                </Button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="block w-full text-center text-xs text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? t("otpResendIn", { seconds: resendCooldown })
                    : t("otpResend")}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); setResendCooldown(0); }}
                  className="block w-full text-center text-xs text-slate-400 hover:text-slate-600"
                >
                  {t("changeNumber")}
                </button>
              </>
            )}
          </div>
        )}

        {/* Email form */}
        {method === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">{t("email")}</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">{t("password")}</Label>
                <Link href="/login" className="text-xs text-[var(--ev-blue)]">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {tc("login")}
            </Button>
          </form>
        )}

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-slate-500">
              {locale === "fr" ? "ou" : "or"}
            </span>
          </div>
        </div>

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <GoogleIcon className="mr-2 size-4" />
          {t("googleLogin")}
        </Button>

        <p className="text-center text-sm text-slate-500">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-[var(--ev-blue)]">
            {tc("register")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
