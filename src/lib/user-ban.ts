import type { SupabaseClient } from "@supabase/supabase-js";

/** Déconnecte si le profil est banni. Retourne true si banni. */
export async function signOutIfBanned(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("users").select("is_banned").eq("id", userId).maybeSingle();
  if (!data?.is_banned) return false;

  await supabase.auth.signOut();
  return true;
}
