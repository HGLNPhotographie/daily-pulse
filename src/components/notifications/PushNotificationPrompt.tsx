"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissPushPrompt,
  getPushPermission,
  isPushSupported,
  subscribeToPush,
  wasPushPromptDismissed,
} from "@/lib/push";

const SHOW_DELAY_MS = 2000;

export function PushNotificationPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (!isPushSupported()) return;
    if (getPushPermission() !== "default") return;
    if (wasPushPromptDismissed()) return;

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = () => {
    dismissPushPrompt();
    setVisible(false);
  };

  const handleEnable = async () => {
    setLoading(true);
    const result = await subscribeToPush();
    setLoading(false);

    if (result.ok) {
      setVisible(false);
      return;
    }

    if (result.error === "Permission refusée.") {
      dismissPushPrompt();
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[var(--bottom-nav-offset)] z-50 flex justify-center px-4 sm:bottom-6">
      <div
        role="dialog"
        aria-labelledby="push-prompt-title"
        className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 shadow-lg"
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04]">
            <Bell className="h-5 w-5 text-black/70" />
          </div>
          <div>
            <p id="push-prompt-title" className="font-semibold leading-tight">
              Ne rien manquer
            </p>
            <p className="text-sm text-black/50">Sois prévenu dès qu&apos;une nouvelle question tombe.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleDismiss} disabled={loading}>
            Plus tard
          </Button>
          <Button type="button" className="flex-1" onClick={() => void handleEnable()} disabled={loading}>
            {loading ? "Activation..." : "Activer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
