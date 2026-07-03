import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseServerConfigured = Boolean(supabaseUrl && serviceRoleKey);
export const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Client Supabase "admin" (service role) pour les routes API serveur
 * uniquement. Ne JAMAIS importer ce module depuis un composant client.
 */
export function getSupabaseServerClient() {
  if (!isSupabaseServerConfigured) {
    throw new Error(
      "Supabase server client demandé mais NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants."
    );
  }
  return createClient(supabaseUrl as string, serviceRoleKey as string, {
    auth: { persistSession: false },
  });
}

/** Client serveur lié à la session cookies de l'utilisateur (RLS active). */
export async function createSupabaseServerAuthClient() {
  if (!isSupabaseAuthConfigured) {
    throw new Error("Supabase auth client demandé mais les clés publiques manquent.");
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // setAll depuis un Server Component en lecture seule — ignoré.
        }
      },
    },
  });
}

async function getUserFromBearerToken(token: string) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Résout l'utilisateur depuis Authorization Bearer ou cookies de session.
 */
export async function requireUserFromRequest(
  request: NextRequest
): Promise<{ user: User } | { error: string; status: number }> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (token) {
    const user = await getUserFromBearerToken(token);
    if (!user) return { error: "Session invalide ou expirée.", status: 401 as const };
    return { user };
  }

  if (!isSupabaseAuthConfigured) {
    return { error: "Authentification requise.", status: 401 as const };
  }

  const supabase = createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Lecture seule dans les route handlers.
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { error: "Authentification requise.", status: 401 as const };
  return { user };
}

/**
 * Vérifie qu'un utilisateur authentifié est admin (`users.is_admin = true`).
 */
export async function requireAdminFromRequest(
  request: NextRequest
): Promise<{ userId: string } | { error: string; status: number }> {
  const auth = await requireUserFromRequest(request);
  if (!("user" in auth)) return { error: auth.error, status: auth.status };

  const supabase = getSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) return { error: profileError.message, status: 500 };
  if (!profile?.is_admin) return { error: "Accès administrateur requis.", status: 403 };

  return { userId: auth.user.id };
}
