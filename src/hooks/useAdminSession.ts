"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { userIsAdmin } from "@/lib/admin-check";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type AdminSessionStatus =
  | "loading"
  | "demo" // pas de Supabase en dev local : panneau ouvert pour la démo
  | "unconfigured" // prod sans variables Supabase
  | "signed-out"
  | "authorized";

function isGuestSession(user: User): boolean {
  if (user.is_anonymous) return true;
  if (user.app_metadata?.provider === "anonymous") return true;
  return !user.email;
}

interface UseAdminSessionResult {
  status: AdminSessionStatus;
  user: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Garde d'accès du panneau `/admin` : exige une session Supabase avec `users.is_admin = true`. */
export function useAdminSession(): UseAdminSessionResult {
  const router = useRouter();
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus(process.env.NODE_ENV === "development" ? "demo" : "unconfigured");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus(process.env.NODE_ENV === "development" ? "demo" : "unconfigured");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user || isGuestSession(session.user)) {
      setUser(null);
      setStatus("signed-out");
      return;
    }

    const isAdmin = await userIsAdmin(supabase, session.user.id);

    if (!isAdmin) {
      setUser(null);
      setStatus("signed-out");
      return;
    }

    setUser(session.user);
    setStatus("authorized");
  }, []);

  useEffect(() => {
    // Vérification de session au montage (Supabase/localStorage indisponibles
    // avant le montage) : pattern de synchronisation avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange(() => checkSession());
    return () => subscription.subscription.unsubscribe();
  }, [checkSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (!data.user || !(await userIsAdmin(supabase, data.user.id))) {
        await supabase.auth.signOut();
        setError("Ce compte n'a pas les droits administrateur.");
        setStatus("signed-out");
        return;
      }
      router.replace("/admin");
    },
    [router]
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setStatus("signed-out");
    setUser(null);
  }, []);

  return { status, user, error, signIn, signOut };
}
