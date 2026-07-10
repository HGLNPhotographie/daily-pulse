"use client";

interface SoireeVoteTimerProps {
  secondsLeft: number;
  totalSeconds: number;
}

export function SoireeVoteTimer({ secondsLeft, totalSeconds }: SoireeVoteTimerProps) {
  const progress = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-4xl font-bold tabular-nums">{secondsLeft}s</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
