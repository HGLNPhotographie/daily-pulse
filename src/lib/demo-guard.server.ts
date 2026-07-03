import "server-only";

/**
 * Bloque les routes `/api/demo/*` dès que Supabase est configuré (prod / staging).
 */
export function assertDemoApiAvailable(): Response | null {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Non disponible." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
