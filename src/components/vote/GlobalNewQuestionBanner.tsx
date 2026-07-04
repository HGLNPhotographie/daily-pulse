"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { NewQuestionBanner } from "@/components/vote/NewQuestionBanner";

export function GlobalNewQuestionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { incomingQuestion, acceptIncomingQuestion } = useDailyQuestion();

  const handleAccept = useCallback(() => {
    acceptIncomingQuestion();
    if (pathname !== "/") {
      router.push("/");
    }
  }, [acceptIncomingQuestion, pathname, router]);

  return (
    <AnimatePresence>
      {incomingQuestion && (
        <NewQuestionBanner key={incomingQuestion.id} onAccept={handleAccept} />
      )}
    </AnimatePresence>
  );
}
