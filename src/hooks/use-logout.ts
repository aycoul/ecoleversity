"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side logout that guarantees cookies are cleared in the browser
 * before the next page loads. Server-side signOut() + redirect() has a
 * known cookie-propagation issue in Next.js App Router, so we sign out
 * on the client and then do a full page reload to ensure the root layout
 * re-fetches fresh (null) auth state.
 */
export function useLogout() {
  return useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);
}
