"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Show", icon: Tv },
  { href: "/streak", label: "Flamme", icon: Flame },
  { href: "/compte", label: "Compte", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/8 bg-white pt-2 pb-[var(--bottom-nav-safe)]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 px-2 py-1.5"
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-black" : "text-black/35"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-black" : "text-black/35"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
