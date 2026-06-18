"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  ListChecks,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/workout", label: "Workout", icon: Dumbbell, primary: true },
  { href: "/programs", label: "Programs", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground bg-background md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          if (tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 border-x-2 border-foreground py-2 ${
                  isActive
                    ? "bg-signal text-signal-foreground"
                    : "bg-foreground text-background"
                }`}
              >
                <tab.icon className="h-5 w-5" strokeWidth={2.4} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <tab.icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.6 : 2}
              />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {tab.label}
              </span>
              {isActive && (
                <span className="mt-0.5 h-0.5 w-5 bg-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
