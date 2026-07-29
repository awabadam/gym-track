import { Block } from "@/components/shared/block";
import { StreakMilestones } from "@/components/shared/streak-milestones";
import {
  addDays,
  computeStreaks,
  startOfWeek,
  weekdayKeyOf,
} from "@/lib/streaks";

type CellState = "completed" | "today" | "missed" | "rest" | "future";

/* Cell fills are foreground-derived (not muted-on-card) so they stay legible
   in both themes — muted vs card is nearly invisible in the ink theme. */
const CELL_CLASS: Record<CellState, string> = {
  completed: "bg-signal",
  today: "border-2 border-foreground bg-card",
  missed: "border border-foreground/35 bg-transparent",
  rest: "bg-foreground/15",
  future: "bg-foreground/[0.06]",
};

const WEEKS = 52; // a full year on desktop; mobile shows the trailing 12
const MOBILE_WEEKS = 12;

/**
 * Dashboard consistency block: dual streak stats (weekly + session) beside a
 * contribution-style grid of the trailing training history. Server-rendered,
 * pure props — pass sessions + the active program's scheduled weekdays.
 */
export function ConsistencyStrip({
  sessions,
  scheduledWeekdays,
  today,
  className,
}: {
  sessions: { date: string; status: string }[];
  scheduledWeekdays: string[];
  today: string;
  className?: string;
}) {
  const completedDates = new Set(
    sessions.filter((s) => s.status === "completed").map((s) => s.date)
  );
  const { weeklyStreak, sessionStreak, workoutsLast30 } = computeStreaks({
    completedDates,
    scheduledWeekdays,
    today,
  });
  const scheduled = new Set(scheduledWeekdays);

  // Only mark "missed" from the first completed session onward — a brand-new
  // user shouldn't face a wall of hollow missed cells before they ever train.
  let firstCompleted: string | null = null;
  for (const d of completedDates) {
    if (firstCompleted === null || d < firstCompleted) firstCompleted = d;
  }

  const currentMonday = startOfWeek(today);
  const columns = Array.from({ length: WEEKS }, (_, i) => {
    const weekStart = addDays(currentMonday, -7 * (WEEKS - 1 - i));
    return Array.from({ length: 7 }, (_, row) => {
      const date = addDays(weekStart, row);
      let state: CellState;
      if (date > today) state = "future";
      else if (completedDates.has(date)) state = "completed";
      else if (date === today && scheduled.has(weekdayKeyOf(date))) state = "today";
      else if (
        scheduled.has(weekdayKeyOf(date)) &&
        firstCompleted !== null &&
        date >= firstCompleted
      )
        state = "missed";
      else state = "rest";
      return { date, state };
    });
  });

  const stats = [
    { label: "Week Streak", value: weeklyStreak, unit: weeklyStreak === 1 ? "wk" : "wks" },
    { label: "Session Streak", value: sessionStreak, unit: sessionStreak === 1 ? "day" : "days" },
  ];

  return (
    <Block title="Consistency" tag={`// ${workoutsLast30}/30d`} className={className}>
      <StreakMilestones weeklyStreak={weeklyStreak} sessionStreak={sessionStreak} />
      <div className="flex flex-col md:flex-row">
        {/* Dual streak stats — same visual language as the stat strip. */}
        <div className="grid shrink-0 grid-cols-2 gap-[2px] border-b-2 border-foreground bg-foreground md:w-56 md:grid-cols-1 md:border-b-0 md:border-r-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-card p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </div>
              <div
                className="mt-2 text-5xl tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
                <span
                  className="ml-1 align-baseline text-sm font-bold lowercase tracking-normal text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Contribution grid + legend. */}
        <div className="flex flex-1 flex-col justify-center gap-3 p-4 md:p-5">
          {/* Full-width mosaic: columns flow per week (7 rows), 1fr tracks so
              the grid stretches across the block instead of floating in it. */}
          <div
            role="img"
            aria-label={`Training consistency, last ${WEEKS} weeks: ${workoutsLast30} workouts in the last 30 days, ${weeklyStreak}-week streak, ${sessionStreak} consecutive sessions.`}
            className="grid w-full auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]"
          >
            {columns.flatMap((col, i) =>
              col.map((cell) => (
                <span
                  key={cell.date}
                  aria-hidden="true"
                  className={`aspect-square w-full ${
                    i < WEEKS - MOBILE_WEEKS ? "hidden md:block" : "block"
                  } ${CELL_CLASS[cell.state]}`}
                />
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-signal" /> Trained
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 border border-foreground/35" /> Missed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-foreground/15" /> Rest
            </span>
            <span className="ml-auto font-mono normal-case tracking-normal">
              {workoutsLast30} workouts / 30 days
            </span>
          </div>
        </div>
      </div>
    </Block>
  );
}
