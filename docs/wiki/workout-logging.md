# Workout Logging & Sessions

This page documents how a workout session is created, logged set-by-set, and reviewed in the gym-track app. A **session** is one training day performed on one date; it is always tied to a **program day** (`sessions.programDayId`) and to the owning user (`sessions.userId`). The per-set records live in a separate `session_sets` table.

Two routes render the same session view via the shared `SessionDetail` component:

- `/workout/[sessionId]` — active logging (`section="workout"`) — `app/(app)/workout/[sessionId]/page.tsx:9`
- `/log/[sessionId]` — read-only review of a completed session (`section="log"`) — `app/(app)/log/[sessionId]/page.tsx:13`

`SessionDetail` redirects between the two so the URL always matches the session status: a completed session opened under `/workout` is sent to `/log`, and an in-progress session opened under `/log` is sent to `/workout` (`components/shared/session-detail.tsx:43`–`44`).

## Session lifecycle

Sessions have a `status` string column, defaulting to `"in_progress"` (`db/schema.ts:89`). Two states are used in practice:

- `in_progress` — session is being logged; editable; lives under `/workout`.
- `completed` — session is finished; read-only under `/log` (unless `?edit=1`); sets `completedAt` (`app/actions/sessions.ts:107`).

`formatStatus` only maps these two values for display (`lib/format.ts:37`).

### Start (from a program)

There is no ad-hoc/free-form workout: every session starts from an existing program day. Two entry points:

- **`StartWorkoutPicker`** (`components/shared/start-workout-picker.tsx`) — a dropdown listing the active program's days, used on the dashboard (`app/(app)/page.tsx`) and in `app/header` (`components/shared/app-header.tsx`). Selecting a day calls the `startSession(programDayId)` server action inside a `useTransition` (`start-workout-picker.tsx:52`). Days may be flagged "Today" (`todayDayId`) or show a scheduled weekday abbreviation (`start-workout-picker.tsx:98`–`106`).
- **`startSession`** (`app/actions/sessions.ts:48`) — validates the id, asserts the program day is followable by the user (owned or coach-assigned via `assertProgramDayOwned`, `app/actions/sessions.ts:33`), inserts a `sessions` row dated today with `status: "in_progress"`, and `redirect`s to `/workout/{id}`.

`getInProgressSession` (`data/sessions.ts:125`) surfaces any existing in-progress session (used by the dashboard/header for a "resume" affordance).

### Log sets → rest timer / wake lock

While active (`!isComplete`), `SessionDetail` renders, per planned exercise, one `SetLogger` row for each planned set (`components/shared/session-detail.tsx:241`–`271`), plus:

- **`RestTimer`** — a sticky bar at the top of the session (`session-detail.tsx:154`).
- **`WakeLock`** — keeps the screen awake during the workout (`session-detail.tsx:304`).

Each exercise card also shows the double-progression suggestion message (`session-detail.tsx:187`).

### Finish / cancel

- **Finish** — a form posts `completeSession.bind(null, sessionId)` (`session-detail.tsx:287`). `completeSession` sets `status: "completed"` + `completedAt`, notifies an active coach (a `workout_logged` notification), revalidates `/`, `/log`, `/progress`, and redirects to `/log` (`app/actions/sessions.ts:103`–`141`).
- **Cancel / discard** — `CancelSessionButton` (shown only while in progress, `session-detail.tsx:136`) opens a confirm dialog and calls `cancelSession`, which **deletes** the session (sets cascade-delete) and redirects to `/` (`components/shared/cancel-session-button.tsx`, `app/actions/sessions.ts:91`–`101`).

Completed sessions can be re-opened for editing via `/log/{id}?edit=1`; the `edit` flag makes an otherwise read-only session editable again (`session-detail.tsx:47`, `130`).

## Logging sets

`SetLogger` (`components/shared/set-logger.tsx`) is a compact one-row-per-set UI (Strong/Hevy style): set number · previous set (reference) · weight (kg) · reps · RIR · a confirm check.

**Data captured for a logged set** (`session_sets` table, `db/schema.ts:150`):

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | uuid | FK → `sessions`, `onDelete: cascade` (`db/schema.ts:154`) |
| `exerciseId` | uuid | FK → `exercises` (`db/schema.ts:155`) |
| `setNumber` | integer | 1-based set index |
| `weight` | real | kg (`db/schema.ts:159`) |
| `reps` | integer | |
| `rir` | integer, nullable | Reps In Reserve (`db/schema.ts:161`) |
| `notes` | text, nullable | present in schema; not written by the set logger |
| `createdAt` | timestamp | defaults to now |

Input behaviour:

- Weight/reps are free-text inputs (`inputMode` decimal/numeric). **RIR is tapped to cycle 0–5** (`set-logger.tsx:144`, `(rir + 1) % 6`); its default is `targetRir` from the program, falling back to `2` (`set-logger.tsx:50`, passed as `defaultRir={targetRir}` at `session-detail.tsx:253`).
- Initial field values pre-fill from an existing logged set, else the previous session's set, else the suggested weight (`set-logger.tsx:52`–`62`).
- Saving calls **`logSet`** (`app/actions/sessions.ts:143`), which validates via `setValuesSchema` (weight 0–10000, reps int 0–1000, rir int 0–50 nullable — `lib/validation.ts:137`) and **upserts by `(sessionId, exerciseId, setNumber)`** so re-saving a set edits it in place instead of duplicating (`app/actions/sessions.ts:157`–`178`).
- On save the client fires a `gymtrack:set-logged` window event (`set-logger.tsx:82`) which the rest timer listens for; there's also a light haptic `navigator.vibrate(10)` (`set-logger.tsx:33`). Editing a field un-confirms the row until you re-check it (`set-logger.tsx:67`).

`updateSet` (`app/actions/sessions.ts:184`) and `deleteSet` (`app/actions/sessions.ts:207`) exist for editing/removing individual sets with ownership checks.

### Progression suggestions

`SessionDetail` computes a suggestion per exercise via `getProgression` (`lib/progression.ts:36`), fed the last session's sets for that exercise/day (`getLastSessionSets`, `data/sessions.ts:86`) and the program rep range. It's a **RIR-aware double-progression engine**:

- No prior data → `not_logged` ("Not logged").
- All sets hit the top of the rep range **and** kept the target reps-in-reserve → `add_weight`; increment is **+2.5 kg upper body, +5 kg lower body** (`lib/progression.ts:62`). "Upper body" is decided by `isUpperBody` against the muscle-group set chest/back/shoulders/biceps/triceps (`lib/progression.ts:118`).
- Hit the top but closer to failure than target → `add_reps`, hold the weight.
- Otherwise → `add_reps`, push for more reps.

Sets with a null RIR are treated as meeting the target so missing data doesn't block progression (`lib/progression.ts:57`). `getStallCount` (`lib/progression.ts:92`) counts consecutive same-weight/reps sessions (the "deload after 3 stalls" rule is documented but the deload branch is not returned by `getProgression`).

The suggested weight passed into each `SetLogger` is `progression.suggestedWeight || lastSets[0]?.weight || 0` (`session-detail.tsx:79`).

### Volume / 1RM calculations

`lib/calculations.ts` provides pure helpers (not called inside the session-logging flow itself, but used elsewhere for progress/PRs):

- `estimated1RM(weight, reps)` — **Epley formula**, `weight * (1 + reps/30)`, rounded to 0.1; returns `weight` for a single rep (`lib/calculations.ts:2`).
- `volume(weight, reps)` = weight × reps; `totalVolume(sets)` sums it (`lib/calculations.ts:9`, `14`).
- `bestEstimated1RM(sets)` — max Epley estimate across sets (`lib/calculations.ts:21`).

PR detection in the review view compares a logged set against `getBestSet` (heaviest set ever, `data/sessions.ts:210`): a set is a PR if it beats the best weight, or ties the weight with more reps (`session-detail.tsx:198`–`201`).

## Past workouts & calendar

### Log a past workout

`AddPastWorkoutDialog` (`components/shared/add-past-workout-dialog.tsx`) is the "Log past workout" action on the log page (`app/(app)/log/page.tsx:47`). It lets the user pick a program day (grouped by program) and a date (constrained to today or earlier, both client-side and server-side), then calls **`startPastSession(dayId, date)`**. That action validates via `startPastSessionSchema` (`lib/validation.ts:131`), rejects future dates, inserts an `in_progress` session on the chosen date, and redirects to `/workout/{id}` where the user enters the sets normally (`app/actions/sessions.ts:67`–`89`). So a "past workout" is just a normal session with a back-dated `date`.

### Calendar

`WorkoutCalendar` (`components/shared/workout-calendar.tsx`) renders a month grid (Monday-first) with client-side month navigation. Sessions are indexed by date string; a day cell is filled dark with a dumbbell icon if it has a `completed` session, or highlighted "signal" if it has only an `in_progress` one (`workout-calendar.tsx:129`–`149`). Cells with sessions link to `/log/{firstSessionId}` and show a tooltip listing each session with its status. Data comes from `getSessionsInRange` (`data/sessions.ts:233`).

The log list page (`app/(app)/log/page.tsx`) groups sessions by date, shows a per-session set count and a status badge, paginates (page size 20), and offers per-row delete via `DeleteSessionButton`.

## Server actions & data functions

### Mutations — `app/actions/sessions.ts` (`"use server"`)

| Action | Line | Effect |
|--------|------|--------|
| `startSession(programDayId)` | 48 | Insert `in_progress` session dated today, redirect to `/workout/{id}` |
| `startPastSession(programDayId, date)` | 67 | Insert `in_progress` session on a past date, redirect to `/workout/{id}` |
| `cancelSession(sessionId)` | 91 | Delete session (sets cascade), redirect to `/` |
| `completeSession(sessionId)` | 103 | Set `completed` + `completedAt`, notify coach, redirect to `/log` |
| `logSet(sessionId, exerciseId, setNumber, weight, reps, rir)` | 143 | Upsert one set by (session, exercise, setNumber) |
| `updateSet(setId, weight, reps, rir)` | 184 | Edit an existing set (ownership-checked) |
| `deleteSet(setId, sessionId)` | 207 | Delete one set |
| `deleteSession(sessionId)` | 218 | Delete a session and all its sets |

Helpers `assertSessionOwned` (`:19`) and `assertProgramDayOwned` (`:33`) enforce per-user access; the latter also allows coach-assigned programs.

### Reads — `data/sessions.ts`

| Function | Line | Purpose |
|----------|------|---------|
| `getRecentSessions(limit)` | 13 | Recent sessions with day name/code |
| `getSessionById(sessionId)` | 32 | Full session: metadata, program-day plan, and logged sets |
| `getLastSessionSets(exerciseId, programDayId, excludeSessionId?)` | 86 | Most recent completed session's sets for an exercise (feeds progression) |
| `getInProgressSession()` | 125 | The user's active session, if any |
| `getRecentSessionsWithSetCount({limit, offset})` | 141 | Paginated log list with per-session set counts + total |
| `getSessionsForCurrentWeek()` | 171 | This week's (Mon–Sun) sessions |
| `getBestSet(exerciseId)` | 210 | Heaviest set ever, for PR detection |
| `getSessionsInRange(startDate, endDate)` | 233 | Sessions in a date range, for the calendar |
| `getLastSessionDatePerDay(dayIds)` | 256 | Last completed date per program day |

## Key files

| File | Role |
|------|------|
| `app/(app)/log/page.tsx` | Log list: sessions grouped by date, paginated, with delete + "log past workout" |
| `app/(app)/log/[sessionId]/page.tsx` | Read-only session review (`section="log"`) |
| `app/(app)/workout/[sessionId]/page.tsx` | Active session logging (`section="workout"`) |
| `components/shared/session-detail.tsx` | Shared session view; orchestrates plan, sets, progression, timer, wake lock, finish |
| `components/shared/set-logger.tsx` | Per-set input row (weight/reps/RIR) → `logSet` |
| `components/shared/rest-timer.tsx` | Sticky stopwatch/countdown; auto-starts on `gymtrack:set-logged` |
| `components/shared/wake-lock.tsx` | Screen wake lock during a live workout |
| `components/shared/start-workout-picker.tsx` | Dropdown to start a session from a program day |
| `components/shared/add-past-workout-dialog.tsx` | Dialog to back-date a new session |
| `components/shared/cancel-session-button.tsx` | Discard (delete) an in-progress session |
| `components/shared/delete-session-button.tsx` | Delete a session from the log list |
| `components/shared/workout-calendar.tsx` | Month calendar of sessions |
| `app/actions/sessions.ts` | All session/set mutations |
| `data/sessions.ts` | All session/set reads |
| `lib/progression.ts` | Double-progression suggestion engine + stall/upper-body helpers |
| `lib/calculations.ts` | Epley 1RM, volume helpers |
| `lib/format.ts` | Date + status display formatting |
| `db/schema.ts` | `sessions` (`:81`) and `session_sets` (`:150`) tables |
| `lib/validation.ts` | `startPastSessionSchema` (`:131`), `setValuesSchema` (`:137`) |

## Related pages

- [Programs & Exercises](./programs-and-exercises.md) — program days and planned exercises that seed a session
- [Progress & Goals](./progress-and-goals.md) — where volume, 1RM, and PRs surface
- [Data Model](./data-model.md) — full schema for `sessions`, `session_sets`, and related tables
