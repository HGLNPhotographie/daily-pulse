"use client";

import QRCode from "react-qr-code";
import { buildSoireeJoinUrl } from "@/lib/soiree/api";

interface SoireeQrCardProps {
  joinCode: string;
}

export function SoireeQrCard({ joinCode }: SoireeQrCardProps) {
  const url = buildSoireeJoinUrl(joinCode);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
        <QRCode value={url} size={180} bgColor="#ffffff" fgColor="#0a0a0a" level="M" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-black/45">Code partie</p>
        <p className="font-display text-2xl tracking-[0.35em] text-black">{joinCode}</p>
      </div>
    </div>
  );
}
