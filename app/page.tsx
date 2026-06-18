import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { ensureUserSeeded } from "@/lib/onboarding";
import { getActiveProgram } from "@/data/programs";
import {
  getRecentSessions,
  getInProgressSession,
  getSessionsForCurrentWeek,
  getSessionsInRange,
} from "@/data/sessions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/shared/block";
import { WorkoutCalendar } from "@/components/shared/workout-calendar";
import { ArrowRight, Clock, Moon, Play } from "lucide-react";

function repsLabel(e: { repRangeMin: number | null; repRangeMax: number | null }) {
  if (e.repRangeMin == null) return null;
  if (e.repRangeMax != null && e.repRangeMax !== e.repRangeMin) {
    return `${e.repRangeMin}-${e.repRangeMax}`;
  }
  return `${e.repRangeMin}`;
}

const WEEK_STATE_LABEL: Record<string, string> = {
  completed: "Done",
  today: "Today",
  upcoming: "Next",
  missed: "Missed",
  rest: "Rest",
};

const WEEKDAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const;

type WeekdayStatus = "completed" | "today" | "upcoming" | "missed" | "rest";

export default async function DashboardPage() {
  // First sign-in: give the user their own starter program before loading data.
  await ensureUserSeeded(await requireUserId());

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const calStart = `${year - (month === 0 ? 1 : 0)}-${String(month === 0 ? 12 : month).padStart(2, "0")}-01`;
  const nextM = month + 2 > 12 ? month + 2 - 12 : month + 2;
  const nextY = month + 2 > 12 ? year + 1 : year;
  const calEnd = `${nextY}-${String(nextM).padStart(2, "0")}-31`;

  const [program, recentSessions, inProgress, weekSessions, calendarSessions] =
    await Promise.all([
      getActiveProgram(),
      getRecentSessions(5),
      getInProgressSession(),
      getSessionsForCurrentWeek(),
      getSessionsInRange(calStart, calEnd),
    ]);

  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const todayDay = program?.days.find((d) => d.scheduledDay === today);

  const todayIndex = WEEKDAYS.findIndex((d) => d.key === today);
  const weekOverview = program
    ? WEEKDAYS.map((weekday, index) => {
        const scheduledDay = program.days.find(
          (d) => d.scheduledDay === weekday.key
        );
        const completedSession = weekSessions.find(
          (s) =>
            s.scheduledDay === weekday.key &&
            (s.status === "completed" || s.status === "in_progress")
        );

        let status: WeekdayStatus;
        if (!scheduledDay) {
          status = "rest";
        } else if (completedSession?.status === "completed") {
          status = "completed";
        } else if (index === todayIndex) {
          status = "today";
        } else if (index < todayIndex) {
          status = "missed";
        } else {
          status = "upcoming";
        }

        return {
          ...weekday,
          scheduledDay,
          completedSession,
          status,
        };
      })
    : null;

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const doneThisWeek = weekOverview
    ? weekOverview.filter((d) => d.status === "completed").length
    : 0;
  const scheduledThisWeek = weekOverview
    ? weekOverview.filter((d) => d.scheduledDay).length
    : 0;
  const weekSets = weekOverview
    ? weekOverview.reduce(
        (sum, d) =>
          sum +
          (d.scheduledDay?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0),
        0
      )
    : 0;
  const restDays = weekOverview
    ? weekOverview.filter((d) => !d.scheduledDay).length
    : 0;

  const stats = [
    { label: "This Week", value: `${doneThisWeek}/${scheduledThisWeek}`, unit: "done" },
    { label: "Week Sets", value: weekSets, unit: "sets" },
    { label: "Train Days", value: program?.days.length ?? 0, unit: "/wk" },
    { label: "Rest Days", value: restDays, unit: "days" },
  ];

  const todaySets =
    todayDay?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* PAGE HEAD */}
      <div className="flex flex-col gap-4 border-b-2 border-foreground pb-6 md:flex-row md:items-end md:justify-between">
        <div className="reveal">
          <span className="inline-block border-2 border-foreground bg-signal px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-signal-foreground">
            {todayLabel}
          </span>
          <h1 className="mt-3 text-6xl md:text-7xl">Dashboard</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {program ? `Training on ${program.name}` : "No active program"}
          </p>
        </div>
        {program && (
          <div className="border-l-2 border-foreground pl-4 text-right text-[11px] uppercase leading-relaxed tracking-wide text-muted-foreground">
            <div>
              Days/wk{" "}
              <span className="font-bold text-foreground">{program.days.length}</span>
            </div>
            <div>
              This week{" "}
              <span className="font-bold text-foreground">
                {doneThisWeek}/{scheduledThisWeek}
              </span>
            </div>
            <div>
              Status <span className="font-bold text-foreground">On Track</span>
            </div>
          </div>
        )}
      </div>

      {/* STAT STRIP — one connected block, ink-line dividers */}
      {program && (
        <div className="reveal grid grid-cols-2 gap-[2px] border-2 border-foreground bg-foreground shadow-[4px_4px_0_0_var(--shadow-color)] md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="group bg-card p-4 transition-colors hover:bg-signal"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground group-hover:text-signal-foreground">
                <span>{s.label}</span>
                <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div
                className="mt-3 text-4xl tabular-nums group-hover:text-signal-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
                <span
                  className="ml-1 align-baseline text-sm font-bold lowercase tracking-normal text-muted-foreground group-hover:text-signal-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* IN PROGRESS */}
      {inProgress && (
        <Block title="Workout In Progress" tag="// Live" className="reveal">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse bg-signal" />
              <span className="text-sm uppercase tracking-wide">
                <span className="font-bold">{inProgress.dayName}</span>{" "}
                <span className="text-muted-foreground">
                  ({inProgress.dayCode}) · {inProgress.date}
                </span>
              </span>
            </div>
            <Button asChild size="sm">
              <Link href={`/workout/${inProgress.id}`}>
                Resume Workout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Block>
      )}

      {/* TODAY'S WORKOUT — day-code hero */}
      {todayDay && !inProgress && (
        <Block title="Today's Workout" tag="// Scheduled" className="reveal">
          <div className="flex items-stretch border-b-2 border-foreground">
            <div className="flex min-w-[110px] flex-col items-center justify-center gap-2 border-r-2 border-foreground bg-signal px-5 py-5 text-signal-foreground sm:min-w-[150px]">
              <span
                className="text-5xl leading-none sm:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {todayDay.dayCode}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.25em]">
                Day Code
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-4">
              <span
                className="text-2xl uppercase sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {todayDay.name}
              </span>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <span>
                  <span className="text-foreground">{todayDay.exercises.length}</span>{" "}
                  Exercises
                </span>
                <span>
                  <span className="text-foreground">{todaySets}</span> Sets
                </span>
              </div>
            </div>
          </div>
          <div>
            {todayDay.exercises.map((e, i) => {
              const reps = repsLabel(e);
              return (
                <div
                  key={`${e.exerciseName}-${i}`}
                  className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b-2 border-foreground px-5 py-3 last:border-b-0 transition-colors hover:bg-signal"
                >
                  <span
                    className="text-base text-muted-foreground group-hover:text-signal-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm font-bold uppercase tracking-wide group-hover:text-signal-foreground">
                    {e.exerciseName}
                  </span>
                  <span
                    className="shrink-0 border-2 border-foreground bg-signal px-2 py-0.5 text-sm text-signal-foreground group-hover:bg-foreground group-hover:text-background"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {reps ? `${e.sets}×${reps}` : `${e.sets} sets`}
                  </span>
                </div>
              );
            })}
          </div>
          <Link
            href="/workout"
            className="flex items-center justify-center gap-2 border-t-2 border-foreground bg-signal py-4 text-lg uppercase tracking-wide text-signal-foreground transition-colors hover:bg-foreground hover:text-background"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Play className="h-5 w-5 fill-current" />
            Start Workout
          </Link>
        </Block>
      )}

      {/* REST DAY */}
      {!todayDay && !inProgress && (
        <Block title="Rest Day" tag="// Recover" className="reveal">
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Moon className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-bold uppercase tracking-wide">
              No Workout Scheduled
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Rest · Recover · Grow
            </p>
          </div>
        </Block>
      )}

      {/* WEEK + CALENDAR */}
      <div className="grid gap-5 md:grid-cols-2">
        {weekOverview && (
          <Block
            title="This Week"
            tag={`// ${scheduledThisWeek} Sessions`}
            className="reveal"
          >
            {weekOverview.map((day) => {
              const exercises = day.scheduledDay?.exercises ?? [];
              const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
              const stateClasses =
                day.status === "completed"
                  ? "bg-foreground text-background"
                  : day.status === "today"
                    ? "bg-signal text-signal-foreground"
                    : day.status === "upcoming"
                      ? "bg-card text-foreground"
                      : "border-transparent text-muted-foreground";

              return (
                <div
                  key={day.key}
                  className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b-2 border-foreground px-4 py-2.5 last:border-b-0 sm:grid-cols-[40px_1fr_auto_70px] ${
                    day.status === "today"
                      ? "bg-signal/15"
                      : day.status === "completed"
                        ? "bg-foreground/[0.04]"
                        : ""
                  }`}
                >
                  <span
                    className={`text-xs font-bold uppercase ${
                      day.status === "today" || day.status === "completed"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {day.label}
                  </span>

                  <div className="min-w-0">
                    {day.scheduledDay ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-bold uppercase tracking-wide ${
                              day.status === "missed"
                                ? "text-muted-foreground line-through"
                                : day.status === "upcoming"
                                  ? "text-muted-foreground"
                                  : ""
                            }`}
                          >
                            {day.scheduledDay.name}
                          </span>
                          <span className="border border-foreground px-1 font-mono text-[10px] font-bold uppercase">
                            {day.scheduledDay.dayCode}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {exercises
                            .slice(0, 3)
                            .map((e) => e.exerciseName)
                            .join(", ")}
                          {exercises.length > 3 && ` +${exercises.length - 3}`}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Rest Day
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {day.scheduledDay ? `${totalSets} sets` : "—"}
                  </span>

                  <span
                    className={`hidden border-2 border-foreground px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide sm:block ${stateClasses}`}
                  >
                    {WEEK_STATE_LABEL[day.status]}
                  </span>
                </div>
              );
            })}
          </Block>
        )}

        <Block title="Training Calendar" tag="// Sessions" className="reveal">
          <div className="p-4">
            <WorkoutCalendar
              sessions={calendarSessions}
              initialYear={year}
              initialMonth={month}
            />
          </div>
        </Block>
      </div>

      {/* RECENT SESSIONS */}
      <Block title="Recent Sessions" tag="// Log" className="reveal">
        {recentSessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted-foreground">
            <Clock className="h-7 w-7" />
            <p className="text-sm font-bold uppercase tracking-wide">
              No Sessions Yet
            </p>
            <Link
              href="/workout"
              className="text-xs uppercase tracking-wide underline"
            >
              Start Your First Workout
            </Link>
          </div>
        ) : (
          recentSessions.map((s) => (
            <Link
              key={s.id}
              href={`/log/${s.id}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b-2 border-foreground px-4 py-3 last:border-b-0 transition-colors hover:bg-signal"
            >
              <span className="bg-foreground px-2 py-1 font-mono text-xs font-bold text-background">
                {s.dayCode}
              </span>
              <span className="text-sm font-bold uppercase tracking-wide group-hover:text-signal-foreground">
                {s.dayName}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground group-hover:text-signal-foreground">
                {formatDate(s.date)}
              </span>
            </Link>
          ))
        )}
      </Block>
    </div>
  );
}
