# Data Layer

[← Wiki Home](README.md)

GymTrack splits database access cleanly:

- **Read path → `data/*.ts`** — plain async functions called directly from Server Components.
- **Write path → `app/actions/*.ts`** — `"use server"` Server Actions called from forms and client buttons.

Both paths begin with `requireUserId()` ([Auth](auth.md)) and scope every owner-owned query to that user. Pure helpers live in [`lib/`](#lib-helpers).

---

## Read path (`data/`)

### `data/programs.ts`

| Function | Returns |
|----------|---------|
| `getPrograms()` | All of the user's programs, by name |
| `getProgramBySlug(slug)` | Full program (days + their exercises) by slug; null if not owned |
| `getProgramById(id)` | Same shape, by id; null if not owned |
| `getAllProgramDays()` | Flat list of the user's days (id, name, dayCode, programName) — used by the "add past workout" picker |
| `getActiveProgram()` | The user's `isActive` program, fully expanded; null if none |

`getProgramById` expands each day with its `program_exercises` joined to the shared catalog (name, muscleGroup, type, sets, rep range, notes, superset group), ordered by `sortOrder`.

### `data/sessions.ts`

| Function | Returns |
|----------|---------|
| `getRecentSessions(limit=10)` | Recent sessions with day name/code |
| `getSessionById(id)` | Session + the day's `plan` (program exercises) + all `loggedSets` + the program's `targetRir`; null if not owned |
| `getLastSessionSets(exerciseId, programDayId, excludeSessionId?)` | Sets from the **most recent completed** session of that exercise on that day — feeds the [progression engine](progression-engine.md) |
| `getInProgressSession()` | The user's single `in_progress` session, if any |
| `getRecentSessionsWithSetCount({limit,offset})` | Paginated sessions + per-session set count + total (the `/log` page) |
| `getSessionsForCurrentWeek()` | This week's sessions (Mon–Sun) for the dashboard week strip |
| `getBestSet(exerciseId)` | Heaviest set ever logged for an exercise |
| `getSessionsInRange(start,end)` | Sessions in a date range (the dashboard calendar) |
| `getLastSessionDatePerDay(dayIds)` | Map of `programDayId → last completed date` (the workout day picker) |

Week math in `getSessionsForCurrentWeek` computes the ISO Monday→Sunday window in JS and compares the text `date` column lexically.

### `data/exercises.ts`

| Function | Returns |
|----------|---------|
| `getExercises({search,muscleGroup,limit,offset})` | Paginated catalog with `ilike` search + muscle filter + total |
| `getAllExercises()` | Whole catalog (for selects/dropdowns) |
| `getMuscleGroups()` | Distinct non-null muscle groups (filter options) |
| `getExerciseById(id)` | One **visible** exercise (system or own) + an `isOwner` flag; `null` if it doesn't exist or belongs to another user |
| `getExerciseHistory(exerciseId)` | Every logged set for the exercise, grouped by session (date, day, sets) |
| `getExerciseStats(exerciseId)` | Aggregates: total sets, distinct sessions, max weight, max reps, and which of the user's programs/days use it |

Note: every catalog read is **visibility-scoped** to the current user — a private `visibleTo(uid)` helper applies `userId IS NULL OR userId = me`, so a user sees system exercises plus their own but never another user's custom exercises. `getExerciseById` additionally returns `isOwner` so the UI knows whether to expose edit/delete (false for system exercises). See [the ownership model](data-model.md#exercises-shared-catalog--custom).

### `data/progress.ts`

`getProgressForProgram(programId, targetRir=2)` is the analytical heart of the `/progress` page. For every unique exercise in the program it:

1. Pulls all sets from **completed** sessions.
2. Computes best [estimated 1RM](progression-engine.md) overall and an **e1RM-per-session series** (oldest → newest) for the sparkline/chart.
3. Derives last weight + lowest reps in the last session.
4. Runs the [progression engine](progression-engine.md) to produce a `recommendation` message.

Returns `ExerciseProgress[]` (exerciseId, name, muscleGroup, repRange, bestE1RM, lastWeight, lastLowestReps, recommendation, series).

---

## Write path (Server Actions)

All files start with `"use server"`. Mutations follow a consistent shape: **`requireUserId()` → ownership check → [validate input](#input-validation) → Drizzle write → `revalidatePath()` → (optional) `redirect()`**.

### Input validation

Every action validates its input with [Zod](https://zod.dev) before writing, via `lib/validation.ts`:

- `parseForm(schema, formData)` — for `<form>` submissions (coerces numeric strings, trims text, maps empty optionals to `null`).
- `parse(schema, data)` — for actions invoked with typed arguments (e.g. `logSet`).

On bad input they throw a clean `Error("field: message")`. Schemas enforce non-empty names, muscle-group/type/weekday enums, `sets ≥ 1`, rep ranges with **max ≥ min**, `targetRir` 0–5, weight/reps/RIR bounds, UUID ids, and `YYYY-MM-DD` dates. This stops malformed input (empty strings, `NaN`) from reaching `NOT NULL` columns.

### Ownership checks

Private helpers re-verify ownership before any write that takes an id from the client; each throws `"Not found"` if the row isn't owned by the current user:

- `assertProgramOwned(programId, uid)` — `actions/programs.ts`
- `assertSessionOwned(sessionId, uid)` — `actions/sessions.ts`
- `assertProgramDayOwned(programDayId, uid)` — `actions/sessions.ts`; joins `programDays → programs.userId` so a session can't be started against another user's day
- `assertExerciseOwned(id, uid)` — `actions/exercises.ts`; only matches non-`NULL`-owned rows, so shared system exercises can't be mutated by anyone

### `app/actions/programs.ts`

| Action | Effect |
|--------|--------|
| `createProgram(formData)` | Insert program (slug from name), redirect to its edit page |
| `updateProgram(programId, formData)` | Update name/description/slug/targetRir |
| `deleteProgram(programId)` | Delete program (cascades days/exercises), redirect to `/programs` |
| `setActiveProgram(programId)` | Deactivate all the user's programs, then activate this one |
| `addProgramDay` / `updateProgramDay` / `deleteProgramDay` | Manage days; new day gets `max(sortOrder)+1` |
| `addProgramExercise` / `updateProgramExercise` / `deleteProgramExercise` | Manage exercises within a day |
| `reorderProgramExercise(id, programId, direction)` | Swap `sortOrder` with the up/down neighbor |
| `duplicateProgramDay(dayId, programId)` | Copy a day + its exercises (`"… (copy)"`, dayCode suffixed `2`) |
| `duplicateProgram(programId)` | Deep-copy a whole program (days + exercises), redirect to the copy's edit page |

`parseTargetRir` clamps the RIR form value to 0–5, defaulting to 2.

### `app/actions/sessions.ts`

| Action | Effect |
|--------|--------|
| `startSession(programDayId)` | Assert the day is owned, then create an `in_progress` session dated today, redirect to `/workout/{id}` |
| `startPastSession(programDayId, date)` | Same (day-ownership asserted), for a validated past `YYYY-MM-DD` (rejects future dates) |
| `cancelSession(sessionId)` | Delete an in-progress session (sets cascade), redirect to `/workout` |
| `completeSession(sessionId)` | Set `status=completed` + `completedAt`, redirect to `/log` |
| `logSet(sessionId, exerciseId, setNumber, weight, reps, rir)` | **Upsert** by `(session, exercise, setNumber)` — re-saving edits in place instead of duplicating |
| `updateSet(setId, weight, reps, rir)` | Edit a set (ownership checked via join to `sessions.userId`) |
| `deleteSet(setId, sessionId)` | Remove a set |
| `deleteSession(sessionId)` | Delete a session and its sets |

### `app/actions/exercises.ts`

| Action | Effect |
|--------|--------|
| `createExercise(formData)` | Add a **custom** exercise stamped with the current user's id |
| `updateExercise(id, formData)` | Edit — only the owner's custom exercise (`assertExerciseOwned`) |
| `deleteExercise(id)` | Owner-only **guarded delete** — refuses if the exercise is used in any program *or* has any logged sets (throws with a message), to protect historical data |

> Note: exercise actions are user-scoped. Shared **system** exercises (`userId IS NULL`) can't be edited or deleted through the app by anyone — curating them is a future admin path (see the [plan](../production-readiness-plan.md)).

---

## `lib/` helpers

| File | Exports |
|------|---------|
| `lib/auth.ts` | `auth`, `requireUserId()` — see [Auth](auth.md) |
| `lib/calculations.ts` | `estimated1RM`, `volume`, `totalVolume`, `bestEstimated1RM` — see [Progression Engine](progression-engine.md) |
| `lib/progression.ts` | `getProgression`, `getStallCount`, `isUpperBody` — see [Progression Engine](progression-engine.md) |
| `lib/format.ts` | `formatDate` (relative: Today/Yesterday/weekday/short), `formatStatus` |
| `lib/slug.ts` | `slugify(name)` — lowercase, non-alphanumerics → `-`, trim dashes |
| `lib/validation.ts` | Zod schemas + `parseForm` / `parse` runners + `idSchema` — see [Input validation](#input-validation) |
| `lib/onboarding.ts` | `ensureUserSeeded(userId)` — first-sign-in program seed (see [Auth](auth.md)) |
| `hooks/use-mobile.ts` | `useIsMobile()` — media-query hook at the 768px breakpoint |
