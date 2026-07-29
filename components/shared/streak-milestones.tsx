"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrutalCelebration } from "@/components/shared/brutal-celebration";

const WEEKLY_MILESTONES = [4, 8, 12, 26, 52];
const SESSION_MILESTONES = [10, 25, 50, 100];

type Milestone = { type: "weekly" | "session"; n: number };

/**
 * Fires a one-time celebration when a streak crosses a milestone. The last
 * celebrated milestone per type is remembered in localStorage so each fires
 * exactly once per account/device. Weekly wins when both cross at once
 * (both get recorded so the session one doesn't re-fire next visit).
 */
export function StreakMilestones({
  weeklyStreak,
  sessionStreak,
}: {
  weeklyStreak: number;
  sessionStreak: number;
}) {
  const [show, setShow] = useState<Milestone | null>(null);

  // localStorage is only readable on the client after mount, and the overlay
  // must not render during SSR (hydration mismatch) — so the one-time
  // milestone check has to set state from this effect. Same pattern and
  // rationale as the rest-timer's persisted-state resume.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const crossed = (
        type: Milestone["type"],
        streak: number,
        milestones: number[]
      ): Milestone | null => {
        const key = `gymtrack:milestone:${type}`;
        const last = Number(localStorage.getItem(key) ?? 0);
        const hit = milestones.filter((m) => m <= streak).pop() ?? 0;
        if (hit > last) {
          localStorage.setItem(key, String(hit));
          return { type, n: hit };
        }
        return null;
      };
      const weekly = crossed("weekly", weeklyStreak, WEEKLY_MILESTONES);
      const session = crossed("session", sessionStreak, SESSION_MILESTONES);
      setShow(weekly ?? session);
    } catch {
      // localStorage unavailable (private mode etc.) — skip celebrations.
    }
  }, [weeklyStreak, sessionStreak]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  const isWeekly = show.type === "weekly";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Milestone reached: ${show.n} ${isWeekly ? "week" : "session"} streak`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={() => setShow(null)}
    >
      <div
        className="w-full max-w-sm border-2 border-foreground bg-card shadow-[6px_6px_0_0_var(--shadow-color)]"
        onClick={(e) => e.stopPropagation()}
      >
        <BrutalCelebration
          kicker={isWeekly ? "Week Streak" : "Session Streak"}
          value={show.n}
          unit={isWeekly ? "wks" : "sessions"}
        >
          <p className="relative max-w-[26ch] text-sm text-muted-foreground">
            {isWeekly
              ? `${show.n} straight weeks hitting every scheduled session.`
              : `${show.n} scheduled sessions in a row without a miss.`}
          </p>
          <Button onClick={() => setShow(null)} className="relative mt-1">
            Keep Going
          </Button>
        </BrutalCelebration>
      </div>
    </div>
  );
}
