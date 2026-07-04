"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { useIsSiteAdmin } from "@/hooks/useIsSiteAdmin";

/** Lien vers `/admin` en haut du site, visible uniquement pour les comptes admin. */
export function AdminDashboardBar() {
  const pathname = usePathname();
  const isAdmin = useIsSiteAdmin();

  if (!isAdmin || pathname?.startsWith("/admin")) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <Link
        href="/admin"
        className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-black shadow-sm transition-colors hover:bg-black/[0.03]"
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>
    </div>
  );
}
