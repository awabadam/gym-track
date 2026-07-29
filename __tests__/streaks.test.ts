import { describe, it, expect } from "vitest";
import {
  computeStreaks,
  startOfWeek,
  weekdayKeyOf,
  addDays,
} from "../lib/streaks";

// Fixed anchor: 2026-07-29 is a WEDNESDAY. Its week starts Mon 2026-07-27.
const TODAY = "2026-07-29";
const SCHEDULE = ["monday", "tuesday", "thursday", "friday"]; // 4 days/wk

describe("date helpers", () => {
  it("weekdayKeyOf handles the Monday-first mapping", () => {
    expect(weekdayKeyOf("2026-07-27")).toBe("monday");
    expect(weekdayKeyOf("2026-07-29")).toBe("wednesday");
    expect(weekdayKeyOf("2026-07-26")).toBe("sunday");
  });

  it("startOfWeek returns the Monday of the containing week", () => {
    expect(startOfWeek("2026-07-29")).toBe("2026-07-27");
    expect(startOfWeek("2026-07-27")).toBe("2026-07-27");
    expect(startOfWeek("2026-07-26")).toBe("2026-07-20");
  });

  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-08-01", -1)).toBe("2026-07-31");
  });
});

/** Every scheduled date in the N full weeks before the current week. */
function fullWeeks(n: number): string[] {
  const dates: string[] = [];
  const currentMonday = startOfWeek(TODAY);
  for (let w = 1; w <= n; w++) {
    const monday = addDays(currentMonday, -7 * w);
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      if (SCHEDULE.includes(weekdayKeyOf(d))) dates.push(d);
    }
  }
  return dates;
}

describe("computeStreaks", () => {
  it("returns zeros for an empty history", () => {
    const r = computeStreaks({ completedDates: [], scheduledWeekdays: SCHEDULE, today: TODAY });
    expect(r).toEqual({ weeklyStreak: 0, sessionStreak: 0, workoutsLast30: 0 });
  });

  it("returns zeros when there is no schedule", () => {
    const r = computeStreaks({
      completedDates: ["2026-07-27", "2026-07-28"],
      scheduledWeekdays: [],
      today: TODAY,
    });
    expect(r.weeklyStreak).toBe(0);
    expect(r.sessionStreak).toBe(0);
    expect(r.workoutsLast30).toBe(2); // still counted
  });

  it("counts 3 fully-met past weeks as a 3-week streak", () => {
    const r = computeStreaks({
      completedDates: fullWeeks(3),
      scheduledWeekdays: SCHEDULE,
      today: TODAY,
    });
    expect(r.weeklyStreak).toBe(3);
  });

  it("does not break the weekly streak while the current week is in progress", () => {
    // 2 past full weeks + only Mon/Tue done this week (Thu/Fri still ahead).
    const done = [...fullWeeks(2), "2026-07-27", "2026-07-28"];
    const r = computeStreaks({ completedDates: done, scheduledWeekdays: SCHEDULE, today: TODAY });
    expect(r.weeklyStreak).toBe(2);
  });

  it("includes the current week once its target is met", () => {
    // Trained 4× this week already (count-based, off-schedule days count too).
    const thisWeek = ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];
    const r = computeStreaks({
      completedDates: [...fullWeeks(1), ...thisWeek],
      scheduledWeekdays: SCHEDULE,
      today: TODAY,
    });
    expect(r.weeklyStreak).toBe(2);
  });

  it("a gap week resets the weekly streak", () => {
    // Week -1 met, week -2 skipped, week -3 met → streak is only 1.
    const week1 = fullWeeks(1);
    const week3 = fullWeeks(3).filter((d) => !fullWeeks(2).includes(d));
    const r = computeStreaks({
      completedDates: [...week1, ...week3],
      scheduledWeekdays: SCHEDULE,
      today: TODAY,
    });
    expect(r.weeklyStreak).toBe(1);
  });

  it("session streak counts consecutive completed scheduled days", () => {
    // Today (Wed) is unscheduled. Tue 28 + Mon 27 done; last week's Fri 24,
    // Thu 23, Tue 21, Mon 20 done → 6. Fri 17 of the week before missed.
    const done = [
      "2026-07-28", "2026-07-27",
      "2026-07-24", "2026-07-23", "2026-07-21", "2026-07-20",
    ];
    const r = computeStreaks({ completedDates: done, scheduledWeekdays: SCHEDULE, today: TODAY });
    expect(r.sessionStreak).toBe(6);
  });

  it("a missed scheduled day breaks the session streak", () => {
    // Tue 28 done, Mon 27 MISSED, prior week fully done → streak stops at 1.
    const done = ["2026-07-28", ...fullWeeks(1)];
    const r = computeStreaks({ completedDates: done, scheduledWeekdays: SCHEDULE, today: TODAY });
    expect(r.sessionStreak).toBe(1);
  });

  it("an untrained scheduled TODAY does not break the session streak", () => {
    // Pretend today is Thursday 2026-07-30 (scheduled) and not yet trained.
    const done = ["2026-07-28", "2026-07-27", "2026-07-24", "2026-07-23"];
    const r = computeStreaks({
      completedDates: done,
      scheduledWeekdays: SCHEDULE,
      today: "2026-07-30",
    });
    expect(r.sessionStreak).toBe(4);
  });

  it("workoutsLast30 only counts the trailing 30-day window", () => {
    const r = computeStreaks({
      completedDates: ["2026-07-29", "2026-06-30", "2026-06-29", "2026-01-01"],
      scheduledWeekdays: SCHEDULE,
      today: TODAY,
    });
    // Window is 2026-06-30 .. 2026-07-29 → 2026-06-29 and 01-01 excluded.
    expect(r.workoutsLast30).toBe(2);
  });
});
