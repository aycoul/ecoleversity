"use client";

import { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const supabase = createClient();

    // NOTE: we don't pass redirectTo because the email template uses
    // {{ .TokenHash }} to build a link to /api/auth/confirm — which works
    // cross-browser (no PKCE code_verifier dependency). The template
    // hardcodes "next=/reset-password" so the user lands on the right page.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-gradient-to-b from-[var(--ev-blue-50)]/30 to-white px-4 py-12">
      <Link href="/" className="mb-6">
        <Image
          src="/logo.png"
          alt="écoleVersity"
          width={200}
          height={52}
          className="h-12 w-auto"
          priority
        />
      </Link>

      <Card className="w-full max-w-md border-slate-100 shadow-lg shadow-[var(--ev-blue)]/5">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-[var(--ev-blue)]">
            Mot de passe oublié
          </CardTitle>
          <CardDescription>
            {sent
              ? "Vérifiez votre boîte mail pour le lien de réinitialisation."
              : "Entrez votre adresse e-mail pour recevoir un lien de réinitialisation."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-[var(--ev-green-50)]">
                <CheckCircle2 className="size-8 text-[var(--ev-green)]" />
              </div>
              <p className="text-sm text-slate-600">
                Un e-mail a été envoyé à <strong>{email}</strong> avec les
                instructions pour réinitialiser votre mot de passe.
              </p>
              <p className="text-xs text-slate-400">
                Si vous ne recevez rien dans les 5 minutes, vérifiez vos
                spams ou réessayez.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-2"
              >
                Essayer une autre adresse
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Adresse e-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                Envoyer le lien
              </Button>
            </form>
          )}

          <div className="border-t border-slate-100 pt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--ev-blue)] hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
