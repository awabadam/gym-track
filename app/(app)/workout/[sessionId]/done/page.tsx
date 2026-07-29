import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionById, getSessionsInRange } from "@/data/sessions";
import { getActiveProgram } from "@/data/programs";
import { computeStreaks } from "@/lib/streaks";
import { BrutalCelebration } from "@/components/shared/brutal-celebration";
import { StreakMilestones } from "@/components/shared/streak-milestones";
import { Button } from "@/components/ui/button";

/**
 * Post-workout summary — the peak-end moment. Finishing a session lands here
 * (not on the plain log list): the stamp, the session's numbers, and where
 * the streaks now stand. Streak-milestone celebrations fire here too.
 */
export default async function WorkoutDonePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  if (!session) notFound();
  // Still running (or reopened): back to the live workout screen.
  if (session.status !== "completed") redirect(`/workout/${sessionId}`);

  const sets = session.loggedSets;
  const totalSets = sets.length;
  const totalReps = sets.reduce((a, s) => a + s.reps, 0);
  const tonnage = Math.round(sets.reduce((a, s) => a + s.weight * s.reps, 0));
  const durationMin =
    session.startedAt && session.completedAt
      ? Math.max(
          1,
          Math.round(
            (session.completedAt.getTime() - session.startedAt.getTime()) / 60000
          )
        )
      : null;

  // Where the streaks stand now that this session is in the books.
  const now = new Date();
  const todayISO = now.toLocaleDateString("en-CA");
  const yearAgo = new Date(now);
  yearAgo.setDate(yearAgo.getDate() - 364);
  const [program, history] = await Promise.all([
    getActiveProgram(),
    getSessionsInRange(yearAgo.toLocaleDateString("en-CA"), todayISO),
  ]);
  const { weeklyStreak, sessionStreak } = computeStreaks({
    completedDates: history
      .filter((s) => s.status === "completed")
      .map((s) => s.date),
    scheduledWeekdays:
      program?.days
        .map((d) => d.scheduledDay)
        .filter((d): d is string => Boolean(d)) ?? [],
    today: todayISO,
  });

  const summary = [
    ...(durationMin != null
      ? [{ label: "Duration", value: durationMin, unit: "min" }]
      : []),
    { label: "Sets", value: totalSets, unit: "" },
    { label: "Reps", value: totalReps, unit: "" },
    { label: "Volume", value: tonnage, unit: "kg" },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <StreakMilestones weeklyStreak={weeklyStreak} sessionStreak={sessionStreak} />

      {/* The stamp */}
      <div className="reveal border-2 border-foreground bg-card shadow-[4px_4px_0_0_var(--shadow-color)]">
        <BrutalCelebration
          kicker={`${session.dayName} — Complete`}
          value={tonnage > 0 ? tonnage : totalSets}
          unit={tonnage > 0 ? "kg" : "sets"}
        >
          <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {session.dayCode} · {session.date}
          </p>
        </BrutalCelebration>
      </div>

      {/* Session numbers */}
      <div className="reveal [animation-delay:120ms] grid grid-cols-2 gap-[2px] border-2 border-foreground bg-foreground sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="bg-card p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </div>
            <div
              className="mt-2 text-3xl tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {s.value}
              {s.unit && (
                <span
                  className="ml-1 align-baseline text-xs font-bold lowercase tracking-normal text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {s.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Streak state */}
      <div className="reveal [animation-delay:200ms] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-2 border-foreground bg-card px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em]">
        <span>
          Week streak{" "}
          <span className="font-mono text-sm tabular-nums">{weeklyStreak}</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          Session streak{" "}
          <span className="font-mono text-sm tabular-nums">{sessionStreak}</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Logged and locked in</span>
      </div>

      {/* Exits */}
      <div className="reveal [animation-delay:260ms] flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/log/${session.id}`}>View Session</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/">Done</Link>
        </Button>
      </div>
    </div>
  );
}
