"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, MessageSquareText, Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "Questions", icon: Radio, exact: false },
  { href: "/admin/suggestions", label: "Suggestions", icon: MessageSquareText, exact: false },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, exact: false },
];

interface AdminSidebarProps {
  onSignOut?: () => void;
  demoMode?: boolean;
}

export function AdminSidebar({ onSignOut, demoMode }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col gap-1 border-b border-border bg-card/60 p-3 sm:h-full sm:w-56 sm:border-b-0 sm:border-r sm:p-4">
      <div className="mb-3 flex items-center gap-2 px-2">
        <Radio className="h-5 w-5 text-primary" />
        <span className="font-display text-lg tracking-wide">RÉGIE</span>
        {demoMode && (
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Démo
          </span>
        )}
      </div>

      <nav className="flex flex-1 gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {onSignOut && !demoMode && (
        <button
          onClick={onSignOut}
          className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-white/5 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      )}

      <Link
        href="/"
        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/5"
      >
        ← Retour à l&apos;app
      </Link>
    </aside>
  );
}
