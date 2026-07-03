import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseMiddlewareConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Rafraîchit la session Supabase (cookies) et applique les garde-fous réseau
 * (désactivation des routes démo quand le backend est configuré).
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/demo") && isSupabaseMiddlewareConfigured) {
    return NextResponse.json({ error: "Non disponible." }, { status: 404 });
  }

  if (!isSupabaseMiddlewareConfigured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
