"use client";

import QRCode from "react-qr-code";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { buildFriendInviteUrl } from "@/lib/friends-api";

interface AccountQrCardProps {
  userId: string;
  pseudo: string | null;
  streak: number;
}

export function AccountQrCard({ userId, pseudo, streak }: AccountQrCardProps) {
  const inviteUrl = buildFriendInviteUrl(userId);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
        <QRCode value={inviteUrl} size={168} bgColor="#ffffff" fgColor="#0a0a0a" level="M" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{pseudo ?? "Sans pseudo"}</p>
        <div className="flex items-center justify-center gap-2">
          <StreakFlame streak={streak} size="sm" />
          <span className="text-sm text-black/55">
            {streak} jour{streak > 1 ? "s" : ""} de flamme
          </span>
        </div>
      </div>
    </div>
  );
}
