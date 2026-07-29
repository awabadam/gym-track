"use client";

import { useEffect, useMemo, useState } from "react";

interface RailExercise {
  id: string;
  name: string;
  planned: number;
  /** Set numbers already logged server-side at render time. */
  loggedSetNumbers: number[];
}

/**
 * Desktop side rail for the live workout: overall set progress, an exercise
 * index with per-lift counts (anchor links jump to each block), and what's up
 * next. Stays in sync while logging via the `gymtrack:set-logged` event that
 * the set logger already dispatches (detail carries exerciseId + setNumber,
 * so re-saving an existing set never double-counts).
 */
export function WorkoutRail({ exercises }: { exercises: RailExercise[] }) {
  const [loggedKeys, setLoggedKeys] = useState<Set<string>>(
    () =>
      new Set(
        exercises.flatMap((ex) =>
          ex.loggedSetNumbers.map((n) => `${ex.id}:${n}`)
        )
      )
  );

  useEffect(() => {
    const onLogged = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { exerciseId?: string; setNumber?: number }
        | undefined;
      if (!detail?.exerciseId || detail.setNumber == null) return;
      setLoggedKeys((prev) => {
        const key = `${detail.exerciseId}:${detail.setNumber}`;
        if (prev.has(key)) return prev;
        const nextSet = new Set(prev);
        nextSet.add(key);
        return nextSet;
      });
    };
    window.addEventListener("gymtrack:set-logged", onLogged);
    return () => window.removeEventListener("gymtrack:set-logged", onLogged);
  }, []);

  const counts = useMemo(() => {
    const byEx = new Map<string, number>();
    for (const key of loggedKeys) {
      const exId = key.slice(0, key.lastIndexOf(":"));
      byEx.set(exId, (byEx.get(exId) ?? 0) + 1);
    }
    return byEx;
  }, [loggedKeys]);

  const totalPlanned = exercises.reduce((a, ex) => a + ex.planned, 0);
  const totalLogged = exercises.reduce(
    (a, ex) => a + Math.min(counts.get(ex.id) ?? 0, ex.planned),
    0
  );
  const upNext = exercises.find(
    (ex) => (counts.get(ex.id) ?? 0) < ex.planned
  );
  const pct = totalPlanned > 0 ? (totalLogged / totalPlanned) * 100 : 0;

  return (
    <nav
      aria-label="Workout progress"
      className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_var(--shadow-color)]"
    >
      {/* Overall progress */}
      <div className="border-b-2 border-foreground p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Session
          </span>
          <span className="font-mono text-sm font-bold tabular-nums">
            {totalLogged}/{totalPlanned}
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full border-2 border-foreground bg-background">
          <div
            className="h-full bg-signal transition-[width] duration-300"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        {upNext && (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Up next{" "}
            <span className="text-foreground">{upNext.name}</span>
          </p>
        )}
        {!upNext && totalPlanned > 0 && (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-signal-foreground">
            <span className="bg-signal px-1.5 py-0.5">All sets logged</span>
          </p>
        )}
      </div>

      {/* Exercise index */}
      <ol className="text-sm">
        {exercises.map((ex, i) => {
          const done = Math.min(counts.get(ex.id) ?? 0, ex.planned);
          const complete = done >= ex.planned;
          return (
            <li key={ex.id} className="border-b-2 border-foreground last:border-b-0">
              <a
                href={`#ex-${ex.id}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted ${
                  complete ? "text-muted-foreground" : ""
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-foreground font-mono text-[10px] font-bold ${
                    complete ? "bg-signal text-signal-foreground" : "bg-card"
                  }`}
                >
                  {complete ? "✓" : String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide">
                  {ex.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {done}/{ex.planned}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
