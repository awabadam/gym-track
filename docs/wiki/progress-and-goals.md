# Progress, Goals & Analytics

The app turns logged workouts into feedback: a dashboard that surfaces the current
week at a glance, a Progress page that heat-maps training volume and recommends the
next move per exercise, and a Goals page for strength PRs and 1RM targets. All the
numbers are derived from completed sessions and a small set of formulas in
`lib/calculations.ts`.

Related pages: [Workout logging](./workout-logging.md) · [Programs & exercises](./programs-and-exercises.md) · [Data model](./data-model.md)

## Home dashboard

`app/(app)/page.tsx` is dual-purpose: signed-out visitors get the marketing
landing page (`KineticLanding`), signed-in users get the dashboard
(`app/(app)/page.tsx:52-55`). On first sign-in it seeds a starter program via
`ensureUserSeeded` (`app/(app)/page.tsx:58`).

Data is loaded in one `Promise.all`: active program, 5 recent sessions, any
in-progress session, this week's sessions, and a calendar window
(`app/(app)/page.tsx:68-75`).

What it surfaces:

- **Stat strip** — four cards (`app/(app)/page.tsx:141-146`): "This Week"
  (`doneThisWeek/scheduledThisWeek`), "Week Sets" (sum of planned sets across
  scheduled days), "Train Days" (`program.days.length`), and "Rest Days". These
  are computed from the week overview, not the database volume
  (`app/(app)/page.tsx:123-139`).
- **Today's workout** — the program day matching today's weekday, with its day
  code, exercise list, and a `startSession` form; falls back to a "Rest Day"
  block when nothing is scheduled (`app/(app)/page.tsx:81`, `237-343`).
- **In-progress banner** — a "Resume Workout" link when a session is open
  (`app/(app)/page.tsx:215-234`).
- **This Week overview** — each weekday tagged `completed` / `today` / `upcoming` /
  `missed` / `rest`, derived by comparing scheduled days against logged sessions
  (`app/(app)/page.tsx:84-115`).
- **Training calendar** (`WorkoutCalendar`) and **Recent sessions** log
  (`app/(app)/page.tsx:436-491`).

Note: the dashboard shows *planned/scheduling* stats. The trained-volume analytics
live on the Progress page.

## Progress analytics

`app/(app)/progress/page.tsx` requires an active program; otherwise it shows an
empty state (`app/(app)/progress/page.tsx:25-41`). It loads three things in
parallel (`app/(app)/progress/page.tsx:43-47`):

1. `getProgressForProgram(program.id, program.targetRir)` — per-exercise trend and
   next-move recommendation.
2. `getMyActualVolumeByMuscle(30)` — logged sets per muscle over the last 30 days.
3. `getAchievedGoals()` — the trophy case (shown compact, limit 8).

### Planned vs. trained volume body maps

Two `MuscleVolumeMap` figures sit side by side
(`app/(app)/progress/page.tsx:95-113`):

- **Planned volume** — built from the program's exercises, mapping each to its
  `primaryMuscle`, `secondaryMuscles`, and `sets`.
- **Trained volume** — from `getActualVolumeByMuscle`, which counts logged
  `sessionSets` rows per `exercises.primaryMuscle` from **completed** sessions in
  the last N days (`data/progress.ts:38-58`).

`MuscleVolumeMap` (`components/shared/muscle-volume-map.tsx`) renders front +
back figures via `react-body-highlighter`. It aggregates primary-muscle set totals,
buckets each total into a 1–5 heat tier (`bucket()`, `muscle-volume-map.tsx:26-30`:
≤3, ≤7, ≤11, ≤15, else), and lists secondary muscles as lightly "assisting". A
primary muscle is never also counted as assisting (`muscle-volume-map.tsx:100`).
The sibling `MuscleHighlight` export (`muscle-volume-map.tsx:180`) is the compact
two-tier version used on the exercise detail page.

### Per-exercise progress table

Below the maps, exercises are grouped by muscle group and sorted by weekly planned
sets (`app/(app)/progress/page.tsx:57-72`). Each row (desktop table / mobile list)
shows a **trend sparkline**, rep range, best E1RM, last weight, lowest reps of the
last session, and a "next move" recommendation
(`app/(app)/progress/page.tsx:178-213`).

`getProgressForProgram` (`data/progress.ts:68-174`) computes this per unique
exercise from that user's completed-session sets:

- `bestE1RM` — best estimated 1RM across all logged sets.
- `series` — best estimated 1RM per session date, oldest → newest, feeding the
  sparkline (`data/progress.ts:138-145`).
- `lastWeight` / `lastLowestReps` — from the most recent session's sets.
- `recommendation` — from `getProgression` in `lib/progression.ts` (uses target
  RIR and upper/lower-body flag) — see [Workout logging](./workout-logging.md).

### Charts

- **`Sparkline`** (`components/shared/sparkline.tsx`) — a minimal, static,
  server-renderable trend line (no axes/interactivity) with a square cap on the
  latest point. Used in the progress table and in each `LiftRow` on Goals.
- **`LineChart`** (`components/shared/line-chart.tsx`) — a full interactive
  `"use client"` SVG chart with gridlines, hover crosshair, and tooltip. It is
  **not** used on the Progress page itself; it renders on the exercise detail page
  for "Estimated 1RM" and "Volume / Session" series
  (`app/(app)/exercises/[id]/page.tsx:210,215`).

## Goals

`app/(app)/goals/page.tsx` loads `getStrengthData()` and `getAchievedGoals()`, then
renders a `StrengthSection` plus a full `AchievementsShowcase`
(`app/(app)/goals/page.tsx:6-23`).

### Goal types: implemented vs. planned

The `goals` table is a single lean table discriminated by `type`, with a DB CHECK
constraint enforcing the right columns per type
(`db/schema.ts:222-254`). Four types are *defined in the schema*:

| Type | Target unit | Extra column | Status in code |
| --- | --- | --- | --- |
| `strength` | 1RM kg | `exerciseId` | **Implemented** (data + actions + UI) |
| `volume` | sets/week for a muscle | `muscle` | Schema only — no code path |
| `consistency` | sessions per `period` (week/month) | `period` | Schema only — no code path |
| `bodyweight` | kg | — | Schema only — no code path |

Every query in `data/goals.ts` and every action in `app/actions/goals.ts` filters
on `type = "strength"` (e.g. `data/goals.ts:76,203`;
`app/actions/goals.ts:84,124`). The comments explicitly note the extra types are
future room (`db/schema.ts:217-221`, `personal_records.kind` "room for max_reps
etc" at `db/schema.ts:208`). So only **strength / 1RM goals** are functional today.

### Strength PRs & targets (`strength-section.tsx`)

`getStrengthData` (`data/goals.ts:45-177`) assembles, per tracked lift:

- `currentOneRm` — the highest manually-logged tested 1RM (`personal_records` rows
  with `kind = "one_rep_max"`).
- `oneRmHistory` — all logged 1RM records (a lift can PR over time).
- `estimatedOneRm` — best estimated 1RM derived from logged workout sets
  ("trending").
- `goal` — the single active strength goal for that lift (unique index enforces one
  active goal per lift, `db/schema.ts:249-252`).
- `progressPct` — `(current ?? estimated) / target × 100`
  (`data/goals.ts:153-157`).

A lift is "tracked" if it has any 1RM record **or** an active goal
(`data/goals.ts:89-96`); tracked lifts sort goals-first, then by current 1RM
(`data/goals.ts:171-174`).

`StrengthSection` (`components/shared/strength-section.tsx`) is a client component.
Each `LiftRow` shows the current 1RM, estimated 1RM, a records-history disclosure
with a mini `Sparkline`, and a goal progress bar. Two dialogs:

- **Log 1RM** (`LogOneRmDialog`) → `logOneRepMax` action
  (`app/actions/goals.ts:34-108`). It inserts a `personal_records` row, computes
  whether it's a new best, and — if it meets an active goal — flips that goal to
  `status = "achieved"` with `achievedAt` set (`app/actions/goals.ts:91-97`). The
  result drives a confetti `CelebrationView` (`strength-section.tsx:256-358`).
- **Set/Edit goal** (`GoalDialog`) → `setStrengthGoal` (upsert of the one active
  goal, `app/actions/goals.ts:111-149`) with `deleteStrengthGoal` /
  `deleteOneRepMax` for removal.

All actions call `requireUserId`, validate input via `lib/validation.ts` schemas,
verify the exercise is shared or user-owned (`assertExerciseVisible`,
`app/actions/goals.ts:16-28`), and `revalidatePath("/goals")` (and `/progress`).

### Achievements (`achievements-showcase.tsx`)

`getAchievedGoals` (`data/goals.ts:191-218`) returns strength goals with
`status = "achieved"`, newest first by `achievedAt`. `AchievementsShowcase`
(`components/shared/achievements-showcase.tsx`) is a trophy case with two variants:
`full` (rich list on the Goals page) and `compact` (a horizontal chip strip on the
Progress page, limit 8). It renders nothing when there are no achievements.

## Calculations

All formulas live in `lib/calculations.ts` (11 lines of actual logic):

- **Estimated 1RM (Epley)** — `estimated1RM(weight, reps)` = `weight × (1 + reps/30)`,
  rounded to one decimal; returns `weight` when `reps === 1`, and `0` for
  non-positive inputs (`lib/calculations.ts:2-6`).
- **`bestEstimated1RM(sets)`** — the max `estimated1RM` across a set of logged sets
  (`lib/calculations.ts:21-26`). This is the workhorse: it powers the Progress
  sparkline series and `bestE1RM` (`data/progress.ts:135,144`) and the "estimated"
  1RM on each tracked lift (`data/goals.ts:143`).
- **Volume** — `volume(weight, reps)` = `weight × reps`; `totalVolume(sets)` sums it
  across sets (`lib/calculations.ts:9-18`). Used for the "Volume / Session" chart on
  the exercise page.

**PR computation** is not a formula — a "PR" here is a *tested* 1RM the user logs
manually into `personal_records`; "new best" is just a `>` comparison against the
prior max (`app/actions/goals.ts:61-64`). Goal completion is likewise a
`value >= targetValue` check (`app/actions/goals.ts:91`).

## Key files

| File | Role |
| --- | --- |
| `app/(app)/page.tsx` | Home dashboard: week overview, stat strip, today's workout, calendar |
| `app/(app)/progress/page.tsx` | Progress page: volume maps + per-exercise trend table |
| `data/progress.ts` | `getProgressForProgram`, `getActualVolumeByMuscle` (trained volume) |
| `app/(app)/goals/page.tsx` | Goals page shell |
| `data/goals.ts` | `getStrengthData`, `getAchievedGoals` (strength only) |
| `app/actions/goals.ts` | `logOneRepMax`, `setStrengthGoal`, delete actions |
| `lib/calculations.ts` | Epley 1RM, volume, best-estimated-1RM |
| `lib/progression.ts` | Next-move recommendation (see workout-logging) |
| `components/shared/muscle-volume-map.tsx` | `MuscleVolumeMap` body heat map + `MuscleHighlight` |
| `components/shared/sparkline.tsx` | Static server-rendered sparkline |
| `components/shared/line-chart.tsx` | Interactive SVG line chart (exercise detail page) |
| `components/shared/strength-section.tsx` | Strength UI: lift rows, log/goal dialogs, celebration |
| `components/shared/achievements-showcase.tsx` | Trophy case (full/compact) |
| `db/schema.ts` | `goals` (4-type discriminated) + `personal_records` tables |
