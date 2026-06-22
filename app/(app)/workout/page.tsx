import { getActiveProgram } from "@/data/programs";
import { getInProgressSession, getLastSessionDatePerDay } from "@/data/sessions";
import { formatDate } from "@/lib/format";
import { startSession } from "@/app/actions/sessions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { CancelSessionButton } from "@/components/shared/cancel-session-button";
import Link from "next/link";
import { ArrowRight, Dumbbell, Play } from "lucide-react";

function getTodayWeekday(): string {
  return new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
}

export default async function WorkoutPage() {
  const [program, inProgress] = await Promise.all([
    getActiveProgram(),
    getInProgressSession(),
  ]);

  if (inProgress) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workout" />
        <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_var(--shadow-color)]">
          <div className="flex items-center gap-2 border-b-2 border-foreground bg-foreground px-4 py-2.5 text-background">
            <span className="h-2 w-2 animate-pulse bg-signal" />
            <span
              className="text-sm uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Session in progress
            </span>
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 items-center justify-center bg-foreground px-2.5 font-mono text-sm font-bold text-background">
                {inProgress.dayCode}
              </span>
              <div>
                <p
                  className="text-lg uppercase leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {inProgress.dayName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {formatDate(inProgress.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CancelSessionButton sessionId={inProgress.id} size="lg" />
              <Button asChild size="lg">
                <Link href={`/workout/${inProgress.id}`}>
                  Resume workout <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workout" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No active program</p>
            <p className="mt-1 text-sm">
              Create and activate a program to start training
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/programs">Go to programs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayWeekday = getTodayWeekday();
  const dayIds = program.days.map((d) => d.id);
  const lastSessionDates = await getLastSessionDatePerDay(dayIds);

  return (
    <div className="space-y-6">
      <PageHeader title="Start Workout" subtitle={`Pick a day · ${program.name}`} />

      <div className="grid gap-5 md:grid-cols-2">
        {program.days.map((day) => {
          const isToday = day.scheduledDay?.toLowerCase() === todayWeekday;
          const lastTrained = lastSessionDates[day.id];
          const exerciseNames = day.exercises.map((e) => e.exerciseName);
          const totalSets = day.exercises.reduce((a, e) => a + e.sets, 0);

          return (
            <form
              key={day.id}
              action={startSession.bind(null, day.id)}
              className="h-full"
            >
              <button
                type="submit"
                className="group flex h-full w-full items-stretch border-2 border-foreground bg-card text-left shadow-[4px_4px_0_0_var(--shadow-color)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--shadow-color)]"
              >
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 p-4">
                  {/* Title row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 items-center justify-center bg-foreground px-2 font-mono text-xs font-bold text-background">
                      {day.dayCode}
                    </span>
                    <span
                      className="text-lg uppercase leading-none"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {day.name}
                    </span>
                    {day.scheduledDay && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {day.scheduledDay}
                      </span>
                    )}
                    {isToday && (
                      <span className="border-2 border-foreground bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-foreground">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Exercise preview */}
                  <p className="line-clamp-2 text-sm leading-snug text-foreground/80">
                    {exerciseNames.join(", ")}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>
                      <span className="font-bold text-foreground tabular-nums">
                        {exerciseNames.length}
                      </span>{" "}
                      exercises
                    </span>
                    <span>
                      <span className="font-bold text-foreground tabular-nums">
                        {totalSets}
                      </span>{" "}
                      sets
                    </span>
                    {lastTrained && <span>Last {formatDate(lastTrained)}</span>}
                  </div>
                </div>

                {/* START panel */}
                <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 border-l-2 border-foreground bg-signal px-5 text-signal-foreground transition-colors group-hover:bg-foreground group-hover:text-background sm:px-7">
                  <Play className="h-6 w-6 fill-current" />
                  <span
                    className="text-sm uppercase tracking-wide"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Start
                  </span>
                </div>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
