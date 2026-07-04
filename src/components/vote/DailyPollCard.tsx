"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CurtainReveal } from "@/components/curtain/CurtainReveal";
import { CountdownShowTV } from "@/components/vote/CountdownShowTV";
import { VoteButtons } from "@/components/vote/VoteButtons";
import { TrendChart } from "@/components/vote/TrendChart";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { LiveVoteCounter } from "@/components/vote/LiveVoteCounter";
import { GuestResultsGate } from "@/components/vote/GuestResultsGate";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { useSimulatedLiveVotes } from "@/hooks/useSimulatedLiveVotes";
import { bumpDemoStreakLocal, useUserProfile } from "@/hooks/useUserProfile";
import { useUserSession } from "@/hooks/useUserSession";
import { isQuestionLiveForUsers, KITSH_CURTAIN_LABEL } from "@/lib/question-active";
import { isSupabaseConfigured } from "@/lib/supabase/client";

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
  const { isAnonymous, status: userStatus } = useUserSession();
  const { displayStreak, refresh: refreshProfile } = useUserProfile();
  const [demoStreak, setDemoStreak] = useState(readDemoStreak);
  const streak = isSupabaseConfigured ? displayStreak : demoStreak;

  const hasVoted = Boolean(myVote);
  const simulateEnabled = Boolean(question && !isCurtainClosing && (curtainOpen || hasVoted));
  const { displayResults, displayTotal } = useSimulatedLiveVotes(question, simulateEnabled);

  const handleVote = async (choice: Parameters<typeof submitVote>[0]) => {
    const isInTime = await submitVote(choice);
    if (isSupabaseConfigured) {
      await refreshProfile();
    } else if (isInTime) {
      setDemoStreak(bumpDemoStreakLocal());
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
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
      </div>
    );
  }

  if (phase === "no-question" || !question) {
    return (
      <div className="flex flex-1 flex-col items-center bg-white px-4 pt-6">
        <header className="mb-6 flex w-full max-w-lg items-center justify-end">
          <StreakFlame streak={streak} size="sm" />
        </header>
        <CurtainReveal open={false} label={KITSH_CURTAIN_LABEL} showWaitingDots className="w-full max-w-lg flex-1" />
      </div>
    );
  }

  const votedInTime = hasVoted && streakDelta === 1;
  const isLateWindow = question ? !isQuestionLiveForUsers(question) : false;
  const curtainVisible = !isCurtainClosing && (curtainOpen || hasVoted);
  const canSeeLiveResults = !isSupabaseConfigured || (userStatus !== "loading" && !isAnonymous);
  const showGuestResultsGate = isSupabaseConfigured && userStatus !== "loading" && isAnonymous && hasVoted;

  return (
    <div className="relative flex flex-1 flex-col items-center bg-white px-4 pt-6">
      {showGuestResultsGate && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-white/60 backdrop-blur-sm" aria-hidden />
      )}

      <header className="mb-6 flex w-full max-w-lg items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
          {isLateWindow ? "Vote tardif" : "En direct"}
        </span>
        <StreakFlame streak={streak} size="sm" celebrate={streakDelta === 1} />
      </header>

      <CurtainReveal open={curtainVisible} label={KITSH_CURTAIN_LABEL} className="w-full">
        <div className="flex w-full flex-col items-center gap-8 text-center text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/45">
            {question.category ?? "Question"}
          </p>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="max-w-md text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
          >
            {question.text}
          </motion.h1>

          <LiveVoteCounter total={displayTotal} />

          {!hasVoted && (
            <>
              <CountdownShowTV expiresAt={question.expires_at} />
              {isLateWindow && (
                <p className="max-w-xs text-xs text-white/50">
                  Temps réglementaire écoulé — tu peux encore voter, sans flamme.
                </p>
              )}
              <VoteButtons
                options={question.options}
                onVote={handleVote}
                disabled={isSubmitting}
                selected={myVote}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          )}

          <AnimatePresence>
            {hasVoted && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex w-full flex-col items-center gap-6"
              >
                <p className="text-sm text-white/70">
                  {votedInTime ? "Vote enregistré · flamme +1" : "Vote enregistré · hors délai, pas de flamme"}
                </p>
                {canSeeLiveResults && (
                  <TrendChart
                    results={displayResults}
                    options={question.options}
                    myVote={myVote}
                    variant="dark"
                    title="Résultats"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CurtainReveal>

      <GuestResultsGate open={showGuestResultsGate} votedInTime={votedInTime} />
    </div>
  );
}
