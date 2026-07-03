"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Flame, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Le Show", icon: Tv },
  { href: "/streak", label: "Flamme", icon: Flame },
  { href: "/compte", label: "Compte", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="neo-border flex w-full max-w-md items-center justify-around gap-0.5 rounded-2xl bg-card/95 px-1 py-2 backdrop-blur">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold sm:text-xs"
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-primary/15"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-5 w-5 transition-colors",
                  active ? "text-primary drop-shadow-[0_0_6px_var(--color-neon-cyan)]" : "text-muted-foreground"
                )}
              />
              <span className={cn("relative z-10 transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
