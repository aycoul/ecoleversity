"use client";

import { useEffect, useState } from "react";
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
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

/**
 * Reset password form — lands here after user clicks the email reset link.
 *
 * Supabase PKCE flow: the email link contains a ?code=... that the server
 * auth callback exchanges for a session. Once on this page, the user is
 * authenticated but must set a new password.
 *
 * If user lands here without an active recovery session (direct visit or
 * expired link), we show an error and point them back to /forgot-password.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setReady(!!data.user);
    });
  }, []);

  const valid =
    password.length >= 8 && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Mot de passe mis à jour");
    router.push("/dashboard/parent/overview");
    router.refresh();
  };

  if (ready === false) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-gradient-to-b from-[var(--ev-blue-50)]/30 to-white px-4 py-12">
        <Card className="w-full max-w-md border-slate-100 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">
              Lien invalide ou expiré
            </CardTitle>
            <CardDescription>
              Le lien de réinitialisation n&apos;est plus valide. Demandez un
              nouveau lien pour continuer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]">
                Demander un nouveau lien
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Nouveau mot de passe
          </CardTitle>
          <CardDescription>
            Choisissez un mot de passe fort pour votre compte.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  required
                  autoComplete="new-password"
                  autoFocus
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={show ? "Cacher" : "Afficher"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer</Label>
              <Input
                id="confirm-password"
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
                autoComplete="new-password"
                minLength={8}
              />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-xs text-red-500">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
              disabled={!valid}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 size-4" />
              )}
              Mettre à jour
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
