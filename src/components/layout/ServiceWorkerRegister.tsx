"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // En dev, le SW peut servir un shell obsolète et gêner les tests sur iPhone.
    if (process.env.NODE_ENV === "development") return;

    (async () => {
      // Dans l'app native (Capacitor), la "PWA-isation" (installabilité,
      // cache offline) n'a pas d'utilité : l'app est déjà un binaire natif.
      if (await isNativePlatform()) return;

      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Échec d'enregistrement du service worker :", err);
      });
    })();
  }, []);

  return null;
}
