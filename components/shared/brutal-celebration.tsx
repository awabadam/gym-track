"use client";

import type { CSSProperties, ReactNode } from "react";

/** 18 deterministic confetti pieces (no RNG → stable) fanning out as they fall. */
export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }, (_, i) => {
        const left = (i * 37) % 100;
        const x = ((i * 53) % 120) - 60;
        const rot = 200 + ((i * 97) % 520);
        const delay = (i % 6) * 0.07;
        const filled = i % 2 === 0;
        return (
          <span
            key={i}
            className={`confetti-piece ${filled ? "bg-signal" : "bg-background"}`}
            style={
              {
                left: `${left}%`,
                "--x": `${x}px`,
                "--r": `${rot}deg`,
                "--d": `${delay}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/**
 * Shared brutalist celebration: confetti + the signal "stamp" (kicker over a
 * huge numeral). Domain-specific rows (deltas, goals, actions) render as
 * children below the stamp. Used for 1RM logs and streak milestones.
 */
export function BrutalCelebration({
  kicker,
  value,
  unit,
  confetti = true,
  children,
}: {
  kicker: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  confetti?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-3.5 overflow-hidden py-6 text-center">
      {confetti && <Confetti />}
      <div
        className="animate-pop relative border-4 border-foreground bg-signal px-6 py-4 text-signal-foreground shadow-[6px_6px_0_0_var(--shadow-color)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <p className="text-xs uppercase tracking-[0.3em]">{kicker}</p>
        <p className="text-6xl leading-none tabular-nums">
          {value}
          {unit != null && <span className="text-2xl"> {unit}</span>}
        </p>
      </div>
      {children}
    </div>
  );
}
