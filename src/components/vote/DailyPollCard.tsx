"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Tv2 } from "lucide-react";
import { CurtainReveal } from "@/components/curtain/CurtainReveal";
import { CountdownShowTV } from "@/components/vote/CountdownShowTV";
import { VoteButtons } from "@/components/vote/VoteButtons";
import { TrendChart } from "@/components/vote/TrendChart";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { bumpDemoStreakLocal, useUserProfile } from "@/hooks/useUserProfile";
import { KITSH_CURTAIN_LABEL } from "@/lib/question-active";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { computeResults } from "@/types";
import { Badge } from "@/components/ui/badge";

const DEMO_STREAK_KEY = "daily-pulse:demo-streak";

function readDemoStreak() {
  if (typeof window === "undefined") return 4;
  const raw = window.localStorage.getItem(DEMO_STREAK_KEY);
  return raw ? Number(raw) : 4;
}

export function DailyPollCard() {
  const {
    question,
    phase,
    myVote,
    curtainOpen,
    isCurtainClosing,
    openCurtain,
    submitVote,
    isSubmitting,
    error,
    streakDelta,
  } = useDailyQuestion();
  const { displayStreak, refresh: refreshProfile } = useUserProfile();
  const [demoStreak, setDemoStreak] = useState(readDemoStreak);
  const streak = isSupabaseConfigured ? displayStreak : demoStreak;

  const handleVote = async (choice: Parameters<typeof submitVote>[0]) => {
    const isInTime = await submitVote(choice);
    if (isInTime) {
      if (isSupabaseConfigured) {
        await refreshProfile();
      } else {
        setDemoStreak(bumpDemoStreakLocal());
      }
    }
  };

  useEffect(() => {
    if (phase === "curtain") {
      const t = setTimeout(openCurtain, 900);
      return () => clearTimeout(t);
    }
  }, [phase, openCurtain]);

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary"
        />
      </div>
    );
  }

  if (phase === "no-question" || !question) {
    return (
      <div className="flex flex-1 flex-col items-center px-4 pt-8">
        <header className="mb-4 flex w-full max-w-md items-center justify-end">
          <StreakFlame streak={streak} size="sm" />
        </header>
        <CurtainReveal open={false} label={KITSH_CURTAIN_LABEL}>
          <div className="min-h-[40vh]" />
        </CurtainReveal>
      </div>
    );
  }

  const results = computeResults(question);
  const hasVoted = phase === "voted-in-time";
  const curtainVisible = !isCurtainClosing && (curtainOpen || hasVoted);

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-8">
      <header className="mb-4 flex w-full max-w-md items-center justify-between">
        <Badge className="gap-1.5 border-none bg-red-600/90 text-white">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          EN DIRECT
        </Badge>
        <StreakFlame streak={streak} size="sm" celebrate={streakDelta === 1} />
      </header>

      <CurtainReveal open={curtainVisible} label={KITSH_CURTAIN_LABEL}>
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-muted-foreground">
            {question.category ?? "Question du jour"}
          </p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="font-display max-w-lg text-3xl leading-tight tracking-wide text-glow-cyan sm:text-4xl"
          >
            {question.text}
          </motion.h1>

          {!hasVoted && (
            <>
              <CountdownShowTV expiresAt={question.expires_at} />
              <VoteButtons
                options={question.options}
                onVote={handleVote}
                disabled={isSubmitting}
                selected={myVote}
              />
              {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            </>
          )}

          <AnimatePresence>
            {hasVoted && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex w-full flex-col items-center gap-4"
              >
                <Badge className="gap-1.5 border-none bg-emerald-500 text-emerald-950">
                  <Tv2 className="h-3.5 w-3.5" /> Vote validé dans les temps · flamme +1
                </Badge>
                <TrendChart results={results} options={question.options} myVote={myVote} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CurtainReveal>
    </div>
  );
}
