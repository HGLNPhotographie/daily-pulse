"use client";

import type { ReactNode } from "react";
import { DailyQuestionProvider } from "@/contexts/DailyQuestionContext";
import { GlobalNewQuestionBanner } from "@/components/vote/GlobalNewQuestionBanner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DailyQuestionProvider>
      <GlobalNewQuestionBanner />
      {children}
    </DailyQuestionProvider>
  );
}
