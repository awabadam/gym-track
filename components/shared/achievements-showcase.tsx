import type { AchievedGoal } from "@/data/goals";
import { Block } from "@/components/shared/block";
import { formatDate } from "@/lib/format";
import { Medal } from "lucide-react";

/**
 * Trophy case of goals the user has hit. `full` is the rich list (Goals page);
 * `compact` is a condensed chip strip (Progress page). Renders nothing when
 * there are no achievements so callers don't need to guard.
 */
export function AchievementsShowcase({
  achievements,
  variant = "full",
  limit,
}: {
  achievements: AchievedGoal[];
  variant?: "full" | "compact";
  limit?: number;
}) {
  if (achievements.length === 0) return null;
  const items = limit ? achievements.slice(0, limit) : achievements;

  if (variant === "compact") {
    return (
      <Block title="Trophy Case" tag={`// ${achievements.length} hit`}>
        <div className="flex gap-2 overflow-x-auto p-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex shrink-0 items-center gap-2 border-2 border-foreground bg-card px-3 py-2"
            >
              <Medal className="h-4 w-4 text-signal" strokeWidth={2.5} />
              <div className="leading-tight">
                <p className="text-xs font-bold uppercase tracking-wide">
                  {a.exerciseName}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {a.targetValue} kg
                  {a.achievedOn ? ` · ${formatDate(a.achievedOn)}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Block>
    );
  }

  return (
    <Block title="Trophy Case" tag={`// ${achievements.length} goals hit`}>
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 border-b-2 border-foreground px-4 py-3 last:border-b-0"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
            <Medal className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold uppercase tracking-wide">
              {a.exerciseName}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Goal hit
            </p>
          </div>
          <span
            className="shrink-0 border-2 border-foreground bg-card px-2.5 py-1 text-lg tabular-nums"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {a.targetValue}
            <span className="text-xs"> kg</span>
          </span>
          {a.achievedOn && (
            <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground sm:block">
              {formatDate(a.achievedOn)}
            </span>
          )}
        </div>
      ))}
    </Block>
  );
}
