"use client";

import type { ReactNode } from "react";
import { DailyQuestionProvider } from "@/contexts/DailyQuestionContext";
import { GlobalNewQuestionBanner } from "@/components/vote/GlobalNewQuestionBanner";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DailyQuestionProvider>
      <GlobalNewQuestionBanner />
      <PushNotificationPrompt />
      {children}
    </DailyQuestionProvider>
  );
}
