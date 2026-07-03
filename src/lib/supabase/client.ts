"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * `true` tant que les variables d'environnement Supabase ne sont pas
 * renseignées. Permet à l'app de tourner en "mode démo" (données simulées)
 * directement après `npm run dev`, sans configuration préalable.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | null = null;

/**
 * Client Supabase navigateur (localStorage) — fiable pour l'auth anonyme
 * et les appels RPC côté votant. Le middleware serveur garde @supabase/ssr.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return browserClient;
}

/** Réinitialise le singleton (tests / changement d'env en dev). */
export function resetSupabaseBrowserClient() {
  browserClient = null;
}

/**
 * Garantit une session authentifiée (anonyme) avant vote / suggestion.
 * Provisionne aussi la ligne public.users (profil invité).
 */
export async function ensureVoterSession(supabase: SupabaseClient): Promise<Session> {
  const provisionProfile = async () => {
    const { error } = await supabase.rpc("ensure_user_profile");
    if (!error) return true;
    const msg = error.message ?? "";
    const stale =
      msg.includes("foreign key") ||
      msg.includes("violates foreign key") ||
      error.code === "23503";
    return !stale;
  };

  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    const profileOk = await provisionProfile();
    if (!profileOk) {
      await supabase.auth.signOut();
      session = null;
    }
  }

  if (!session?.access_token) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw new Error(
        `Connexion anonyme refusée : ${error.message}. Vérifie dans Supabase → Authentication → Providers que « Anonymous Sign-Ins » est activé.`
      );
    }
    if (!data.session?.access_token) {
      throw new Error(
        "Session introuvable après connexion anonyme. Active « Anonymous Sign-Ins » dans Supabase (Authentication → Providers)."
      );
    }
    session = data.session;
    await provisionProfile();
  }

  return session;
}
