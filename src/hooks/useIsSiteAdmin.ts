"use client";

import { useCallback, useEffect, useState } from "react";
import { userIsAdmin } from "@/lib/admin-check";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useUserSession } from "@/hooks/useUserSession";

/** `true` si l'utilisateur connecté (non invité) a `users.is_admin = true`. */
export function useIsSiteAdmin(): boolean {
  const { user, isAnonymous, status } = useUserSession();
  const [isAdmin, setIsAdmin] = useState(false);

  const check = useCallback(async () => {
    if (!isSupabaseConfigured || !user || isAnonymous || status === "loading") {
      setIsAdmin(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(await userIsAdmin(supabase, user.id));
  }, [user, isAnonymous, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.subscription.unsubscribe();
  }, [check]);

  return isAdmin;
}
