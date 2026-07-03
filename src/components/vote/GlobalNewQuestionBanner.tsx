"use client";

import { AnimatePresence } from "framer-motion";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { NewQuestionBanner } from "@/components/vote/NewQuestionBanner";

/** Bannière « nouvelle question » — reste sur la page courante (pas de redirection). */
export function GlobalNewQuestionBanner() {
  const { incomingQuestion, acceptIncomingQuestion } = useDailyQuestion();

  return (
    <AnimatePresence>
      {incomingQuestion && (
        <NewQuestionBanner key={incomingQuestion.id} onAccept={acceptIncomingQuestion} />
      )}
    </AnimatePresence>
  );
}
