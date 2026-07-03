import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Daily Pulse tourne comme une vraie app Next.js (App Router, routes API,
 * Supabase Realtime) : elle ne peut donc pas être exportée en HTML statique
 * (`next export`) sans perdre les routes API (`/api/admin/notify-now`,
 * `/api/cron/notify`, `/api/push/subscribe`) et le SSR.
 *
 * Capacitor charge donc l'app depuis son URL déployée (`server.url`), dans
 * une WebView native packagée en vrai binaire iOS/Android publiable sur les
 * stores — tout le code de `src/` reste strictement identique.
 *
 * - Build de prod (App Store / Play Store) : renseigne CAPACITOR_SERVER_URL
 *   avec l'URL de ton déploiement (ex: https://dailypulse.vercel.app) avant
 *   `npm run cap:sync`.
 * - Dev local sur simulateur/appareil : lance `npm run dev`, puis renseigne
 *   temporairement CAPACITOR_SERVER_URL avec l'IP locale de ta machine
 *   (ex: http://192.168.1.23:3000 — PAS `localhost` sur Android/appareil
 *   physique) pour profiter du live-reload.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.dailypulse.mobile",
  appName: "Kitsh",
  webDir: "public",
  backgroundColor: "#0a0612",
  ...(serverUrl && {
    server: {
      url: serverUrl,
      cleartext: serverUrl.startsWith("http://"),
    },
  }),
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0612",
  },
  android: {
    backgroundColor: "#0a0612",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#0a0612",
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0612",
    },
  },
};

export default config;
