/**
 * Pure streak / consistency computations for the dashboard consistency strip.
 * All dates are local ISO strings ("YYYY-MM-DD"); weeks start on Monday to
 * match the dashboard's WEEKDAYS ordering.
 */

export const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface StreakResult {
  /** Consecutive weeks (incl. this one once met) hitting the scheduled count. */
  weeklyStreak: number;
  /** Consecutive scheduled training days completed without a miss. */
  sessionStreak: number;
  /** Completed workouts in the trailing 30 days. */
  workoutsLast30: number;
}

function parseISO(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const d = parseISO(date);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function weekdayKeyOf(date: string): WeekdayKey {
  // getDay(): 0 = Sunday … 6 = Saturday → Monday-first index.
  const day = parseISO(date).getDay();
  return WEEKDAY_KEYS[(day + 6) % 7];
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string): string {
  const day = parseISO(date).getDay();
  return addDays(date, -((day + 6) % 7));
}

/** Hard cap on how far back we walk; callers fetch ~a year of history. */
const MAX_LOOKBACK_DAYS = 400;

export function computeStreaks({
  completedDates,
  scheduledWeekdays,
  today,
}: {
  completedDates: Iterable<string>;
  scheduledWeekdays: string[];
  today: string;
}): StreakResult {
  const done = new Set(completedDates);
  const scheduled = new Set(scheduledWeekdays);

  // --- workouts in trailing 30 days -------------------------------------
  const cutoff = addDays(today, -29);
  let workoutsLast30 = 0;
  for (const d of done) {
    if (d >= cutoff && d <= today) workoutsLast30++;
  }

  // --- weekly streak -----------------------------------------------------
  // A week counts when its completed-session count reaches the number of
  // scheduled days. The current week never *breaks* the streak while it is
  // still in progress — it just doesn't count until met.
  let weeklyStreak = 0;
  if (scheduled.size > 0) {
    const target = scheduled.size;
    const countInWeek = (weekStart: string) => {
      let n = 0;
      for (let i = 0; i < 7; i++) {
        if (done.has(addDays(weekStart, i))) n++;
      }
      return n;
    };

    let week = startOfWeek(today);
    if (countInWeek(week) >= target) weeklyStreak++;
    // Walk fully-elapsed weeks backward.
    let walked = 7;
    week = addDays(week, -7);
    while (walked < MAX_LOOKBACK_DAYS && countInWeek(week) >= target) {
      weeklyStreak++;
      week = addDays(week, -7);
      walked += 7;
    }
  }

  // --- session streak ----------------------------------------------------
  // Walk backward day-by-day. Scheduled day completed → streak continues;
  // scheduled day missed → break. Today only counts if already trained —
  // an untrained scheduled today is still "in progress", not a miss.
  let sessionStreak = 0;
  if (scheduled.size > 0) {
    let day = today;
    if (weekdayKeyOf(day) && scheduled.has(weekdayKeyOf(day)) && !done.has(day)) {
      day = addDays(day, -1); // today isn't over yet
    }
    for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
      if (scheduled.has(weekdayKeyOf(day))) {
        if (done.has(day)) sessionStreak++;
        else break;
      }
      day = addDays(day, -1);
    }
  }

  return { weeklyStreak, sessionStreak, workoutsLast30 };
}
