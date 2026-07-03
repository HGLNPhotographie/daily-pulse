"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Initialisation spécifique à l'app native (no-op dans un navigateur/PWA) :
 * masque le splash screen une fois l'UI prête, colore la barre de statut, et
 * fait en sorte que le bouton retour Android quitte l'app plutôt que
 * d'afficher un écran blanc quand il n'y a plus d'historique de navigation.
 */
export function CapacitorBootstrap() {
  useEffect(() => {
    (async () => {
      if (!(await isNativePlatform())) return;

      const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => null);
      await StatusBar.setBackgroundColor({ color: "#0a0612" }).catch(() => null);
      await SplashScreen.hide().catch(() => null);

      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
    })();
  }, []);

  return null;
}
