"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { NewQuestionBanner } from "@/components/vote/NewQuestionBanner";

/** Bannière « nouvelle question » affichée sur toutes les pages du site. */
export function GlobalNewQuestionBanner() {
  const router = useRouter();
  const { incomingQuestion, acceptIncomingQuestion } = useDailyQuestion();

  const handleAccept = () => {
    acceptIncomingQuestion();
    router.push("/");
  };

  return (
    <AnimatePresence>
      {incomingQuestion && (
        <NewQuestionBanner key={incomingQuestion.id} onAccept={handleAccept} />
      )}
    </AnimatePresence>
  );
}
