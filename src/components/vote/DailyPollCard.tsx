"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Tv2, ZapOff } from "lucide-react";
import { CurtainReveal } from "@/components/curtain/CurtainReveal";
import { CountdownShowTV } from "@/components/vote/CountdownShowTV";
import { VoteButtons } from "@/components/vote/VoteButtons";
import { TrendChart } from "@/components/vote/TrendChart";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { useDailyQuestion } from "@/hooks/useDailyQuestion";
import { bumpDemoStreakLocal, useUserProfile } from "@/hooks/useUserProfile";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { computeResults } from "@/types";
import { Badge } from "@/components/ui/badge";

const DEMO_STREAK_KEY = "daily-pulse:demo-streak";

function readDemoStreak() {
  if (typeof window === "undefined") return 4;
  const raw = window.localStorage.getItem(DEMO_STREAK_KEY);
  return raw ? Number(raw) : 4;
}

/** Composant principal du "Rendez-vous Quotidien" : orchestre rideau, compte à rebours, vote et résultats. */
export function DailyPollCard() {
  const {
    question,
    phase,
    myVote,
    curtainOpen,
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

  if (phase === "loading" || !question) {
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

  if (phase === "before-window") {
    return <WaitingRoom streak={streak} />;
  }

  const results = computeResults(question);
  const hasVoted = phase === "voted-in-time" || phase === "expired-voted-late";
  const curtainVisible = curtainOpen || hasVoted || phase === "expired-no-vote";

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-8">
      <header className="mb-4 flex w-full max-w-md items-center justify-between">
        <Badge className="gap-1.5 border-none bg-red-600/90 text-white">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          EN DIRECT
        </Badge>
        <StreakFlame streak={streak} size="sm" celebrate={streakDelta === 1} />
      </header>

      <CurtainReveal open={curtainVisible} label="ON AIR">
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

          {!hasVoted && phase !== "expired-no-vote" && (
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

          {phase === "expired-no-vote" && <MissedWindow />}

          <AnimatePresence>
            {hasVoted && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex w-full flex-col items-center gap-4"
              >
                {phase === "voted-in-time" ? (
                  <Badge className="gap-1.5 border-none bg-emerald-500 text-emerald-950">
                    <Tv2 className="h-3.5 w-3.5" /> Vote validé dans les temps · flamme +1
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5">
                    <ZapOff className="h-3.5 w-3.5" /> Voté hors délai · flamme non incrémentée
                  </Badge>
                )}
                <TrendChart results={results} options={question.options} myVote={myVote} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CurtainReveal>
    </div>
  );
}

function WaitingRoom({ streak }: { streak: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <StreakFlame streak={streak} size="lg" />
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide">LE SHOW N&apos;A PAS ENCORE COMMENCÉ</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Une notification arrivera à un horaire surprise aujourd&apos;hui. Reste connecté, tu auras 5 minutes
          pour voter et garder ta flamme allumée.
        </p>
      </div>
    </div>
  );
}

function MissedWindow() {
  return (
    <div className="flex flex-col items-center gap-3">
      <ZapOff className="h-10 w-10 text-destructive" />
      <p className="max-w-xs text-sm text-muted-foreground">
        Le temps imparti est écoulé et tu n&apos;as pas voté. Ta flamme est retombée à zéro. Reviens demain pour la
        prochaine question !
      </p>
    </div>
  );
}
