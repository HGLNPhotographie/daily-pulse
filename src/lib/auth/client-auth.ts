"use client";

import type { Provider, SupabaseClient } from "@supabase/supabase-js";

/** URL de retour OAuth (web). À whitelister dans Supabase → Authentication → URL Configuration. */
export function getAuthCallbackUrl(nextPath = "/compte"): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export async function signInWithOAuthProvider(
  supabase: SupabaseClient,
  provider: Provider,
  options: { linkAnonymous: boolean; nextPath?: string }
) {
  const redirectTo = getAuthCallbackUrl(options.nextPath);
  if (options.linkAnonymous) {
    return supabase.auth.linkIdentity({ provider, options: { redirectTo } });
  }
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

/** Crée un compte email : convertit la session anonyme ou inscription classique. */
export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
  isAnonymous: boolean
) {
  if (isAnonymous) {
    return supabase.auth.updateUser({ email, password });
  }
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(supabase: SupabaseClient, email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutUser(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
