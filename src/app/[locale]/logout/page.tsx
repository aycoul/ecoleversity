"use client";

import { useEffect } from "react";
import { useLogout } from "@/hooks/use-logout";

export default function LogoutPage() {
  const logout = useLogout();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Déconnexion en cours…</p>
    </div>
  );
}
