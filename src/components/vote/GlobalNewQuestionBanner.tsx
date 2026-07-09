"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { useIsSiteAdmin } from "@/hooks/useIsSiteAdmin";
import { NewQuestionBanner } from "@/components/vote/NewQuestionBanner";

export function GlobalNewQuestionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const isSiteAdmin = useIsSiteAdmin();
  const { incomingQuestion, acceptIncomingQuestion } = useDailyQuestion();

  const handleAccept = useCallback(() => {
    acceptIncomingQuestion();
    if (pathname !== "/") {
      router.push("/");
    }
  }, [acceptIncomingQuestion, pathname, router]);

  // Les admins ne sont pas redirigés vers le Show lors d'une publication.
  if (isSiteAdmin || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <AnimatePresence>
      {incomingQuestion && (
        <NewQuestionBanner key={incomingQuestion.id} onAccept={handleAccept} />
      )}
    </AnimatePresence>
  );
}
