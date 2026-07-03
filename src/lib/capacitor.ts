"use client";

/**
 * Petite couche d'abstraction : le code web (composants, hooks) reste
 * strictement identique qu'il tourne dans un navigateur classique (PWA) ou
 * empaqueté nativement via Capacitor (iOS/Android) — il appelle toujours ces
 * fonctions, qui choisissent la bonne implémentation à l'exécution.
 */

export async function isNativePlatform(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Vibration au clic (vote, célébration streak...) : Haptics natif si dispo, sinon Vibration API du navigateur. */
export async function triggerHaptic(style: "light" | "medium" | "heavy" = "light"): Promise<void> {
  if (typeof window === "undefined") return;

  if (await isNativePlatform()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
      return;
    } catch {
      // ignore — retombe sur l'API navigateur ci-dessous
    }
  }

  if ("vibrate" in navigator) {
    navigator.vibrate(style === "heavy" ? 60 : style === "medium" ? 45 : 30);
  }
}
