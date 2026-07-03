import type { SupabaseClient } from "@supabase/supabase-js";

export async function userIsAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("users").select("is_admin").eq("id", userId).maybeSingle();
  return Boolean(data?.is_admin);
}
