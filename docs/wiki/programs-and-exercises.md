# Programs & Exercises

GymTrack organizes training around two related domains: a **shared exercise catalog** (a library of movements, each annotated with the muscles it works) and **programs** (per-user training blueprints that arrange those exercises into a weekly schedule of days). Programs reference exercises, exercises carry the fine-grained muscle metadata, and that metadata is what powers the body-map heat visualizations on both surfaces.

This page documents the exercise library, the nested program structure, how both are created/edited, and how muscle volume is derived and rendered. See also [`./data-model.md`](./data-model.md) for the underlying tables, [`./workout-logging.md`](./workout-logging.md) for how program days become logged sessions, [`./progress-and-goals.md`](./progress-and-goals.md) for analytics, and [`./trainer-features.md`](./trainer-features.md) for coach-assigned programs.

---

## Exercise catalog

### Shared vs. private exercises

Exercises live in a single `exercises` table (`db/schema.ts:4`). Ownership is expressed by `userId` (`db/schema.ts:9`):

- **`userId IS NULL`** — a shared "system" exercise from the seeded catalog. Visible to everyone; editable/deletable by no one (through the normal UI).
- **non-NULL `userId`** — a user's private custom exercise; only that user sees and manages it.

Every catalog read is scoped by the `visibleTo(uid)` predicate — `OR(isNull(userId), eq(userId, uid))` — defined once in `data/exercises.ts:10` and reused across `getExercises`, `getAllExercises`, `getMuscleGroups`, and `getExerciseById`.

### Muscle metadata (primary / secondary)

Each exercise carries three muscle-related columns (`db/schema.ts:13-17`):

- **`primaryMuscle`** — the main mover, a single fine-grained slug.
- **`secondaryMuscles`** — a text array of supporting-muscle slugs.
- **`muscleGroup`** — a *legacy* coarse 10-group bucket, now **derived** from `primaryMuscle` on every write (see below) and kept only for progression logic (`isUpperBody`) and progress grouping.

The fine-grained taxonomy is defined in `lib/muscles.ts:10-31` as `MUSCLES` — 16 slugs (e.g. `chest`, `front-deltoids`, `upper-back`, `quadriceps`, `gluteal`), each with a display `label`, a body `region` (`upper` / `core` / `lower`), and a `coarse` mapping to one of the 10 legacy `MUSCLE_GROUPS` (`lib/validation.ts:13-16`). Each slug corresponds 1:1 to a region the `react-body-highlighter` diagram can highlight. Helper functions:

- `muscleLabel(slug)` — human label (`lib/muscles.ts:47`).
- `fineToCoarse(slug)` — fine slug → legacy coarse bucket (`lib/muscles.ts:52`), used on write to keep `muscleGroup` in sync.
- `coarseToFine(group)` — backfill direction (`lib/muscles.ts:70`).
- `MUSCLES_BY_REGION` — grouped for the `<optgroup>`/checkbox UIs (`lib/muscles.ts:75`).

### Browsing: search, filter, pagination

The list page `app/(app)/exercises/page.tsx` is a server component. It reads `searchParams` (`q`, `muscle`, `page`), computes a 20-per-page window (`PAGE_SIZE = 20`, `app/(app)/exercises/page.tsx:21`), and fetches rows + total via `getExercises({ search, muscleGroup, limit, offset })` in parallel with `getMuscleGroups()` (`app/(app)/exercises/page.tsx:32-35`).

- **Search** — `getExercises` applies `ilike(exercises.name, '%search%')` (`data/exercises.ts:28`). Client component `SearchInput` (`components/shared/search-input.tsx`) writes `?q=` to the URL on Enter or blur, syncs external URL changes during render (no effect), and resets `page` on a new search.
- **Muscle filter** — `getExercises` adds `eq(exercises.muscleGroup, muscleGroup)` (`data/exercises.ts:31`). `MuscleGroupFilter` (`components/shared/muscle-group-filter.tsx`) is a select populated by the distinct coarse groups from `getMuscleGroups` (`data/exercises.ts:60`); choosing "All muscles" deletes the param, and it also resets `page`.
- **Pagination** — `getExercises` returns `{ rows, total }` (count query runs in parallel, `data/exercises.ts:35-44`). `Pagination` (`components/shared/pagination.tsx`) renders prev/next by computing `Math.ceil(total / pageSize)` and rewriting `?page=`.

The list renders a mobile card list and a desktop table (`app/(app)/exercises/page.tsx:76-146`); each row links to `/exercises/[id]`.

### Detail page

`app/(app)/exercises/[id]/page.tsx` fetches the exercise, its logged history, and aggregate stats in parallel (`getExerciseById`, `getExerciseHistory`, `getExerciseStats` — `app/(app)/exercises/[id]/page.tsx:30-34`); `notFound()` if the exercise isn't visible. It shows:

- Primary + secondary muscle badges and a **"How to perform"** link that is just a Google search URL built from the exercise name (`app/(app)/exercises/[id]/page.tsx:91-101`) — no how-to media is stored.
- Stat cards (best e1RM, sessions, total sets, best weight, best reps), where e1RM/volume series are built from history via `bestEstimated1RM`/`totalVolume` (`app/(app)/exercises/[id]/page.tsx:40-47`).
- A `MuscleHighlight` body diagram of the targeted muscles (`app/(app)/exercises/[id]/page.tsx:190-193`).
- "Used in" program badges from `getExerciseStats().programs` (`data/exercises.ts:176-184`).
- Per-session logged history (latest 20).

Edit/delete controls (`ExerciseActions`) render **only** when `exercise.isOwner` is true (`app/(app)/exercises/[id]/page.tsx:103`); `isOwner` is `exercise.userId === uid`, so shared system exercises expose no controls (`data/exercises.ts:82`).

### Creating & editing exercises

- **Create** — `AddExerciseDialog` (`components/shared/add-exercise-dialog.tsx`) posts to the `createExercise` server action. The form uses `MuscleSelect` (`components/shared/muscle-select.tsx`): a primary-muscle `<select>` grouped by region plus toggle buttons for secondary muscles, submitting `primaryMuscle` (one slug) and `secondaryMuscles` (a comma-separated hidden input, since `parseForm` collapses repeated keys). Type is one of `main` / `compound` / `iso` / `core`.
- **Edit** — `ExerciseActions` (`components/shared/exercise-actions.tsx`) reuses `MuscleSelect` (pre-filled) and posts to `updateExercise`.

Both actions parse via `exerciseSchema` (`lib/validation.ts:64-70`), then recompute `muscleGroup = fineToCoarse(data.primaryMuscle)` to keep the legacy bucket in sync (`app/actions/exercises.ts:27,39`). Ownership is enforced by `assertExerciseOwned` (`app/actions/exercises.ts:15-22`) — shared exercises are owned by no one and cannot be mutated.

**Delete guards** (`app/actions/exercises.ts:50-80`): deletion is refused if the exercise is used in any program (`programExercises`) or has any logged sets (`sessionSets`), so historical data can't be silently lost.

### The import script & catalog size

`db/import-exercises.ts` (run via `npm run db:import-exercises`, `package.json:13`) bulk-imports system exercises from a public dataset (`hasaneyldrm/exercises-dataset`, `db/import-exercises.ts:24-25`). Design decisions verified in the code:

- **Metadata-only** — it imports *only* non-copyrightable facts: the exercise **name** and which **muscles** it works. Instructions prose and images/GIFs are deliberately **not** imported (`db/import-exercises.ts:26-31`); the app's "how to" is the Google search link.
- **Muscle mapping** — the source's muscle vocabulary is mapped to the app's fine slugs via `MUSCLE_MAP` (`db/import-exercises.ts:42-90`). Rows whose `target` has no mappable primary muscle (cardio / unknown) are skipped, because the body map and progression are muscle-based (`db/import-exercises.ts:134-139`).
- **Dedup** — deduped within the dataset by normalized name (first occurrence wins, `db/import-exercises.ts:147-148`) and against existing catalog rows case-insensitively (`db/import-exercises.ts:169-173`); inserted in chunks of 200.
- **`IMPORT_RESET=1`** — deletes prior *system* rows (except the 23 hand-curated `CURATED_NAMES`, `db/import-exercises.ts:12-19`) so an improved muscle mapping re-applies; custom (per-user) and curated rows are preserved (`db/import-exercises.ts:159-165`).

Result in the dev DB: **23 curated + 1288 imported = 1311 system exercises**, all with muscle metadata (per project memory; matches the curated-list + import structure in the script).

---

## Programs

### Nested data model surface

A program is a four-level nested structure (`db/schema.ts`):

```
programs                (db/schema.ts:23)   — the blueprint
  └─ programDays        (db/schema.ts:54)   — a day within the program
       └─ programExercises (db/schema.ts:65) — an exercise slot on that day
            └─ exercises (FK)                — the catalog movement it points at
```

**`programs`** (`db/schema.ts:23-52`): `userId` (owner; `NULL` = shared "recommended" template, parallel to exercises), `assignedClientId` (set when a trainer authored this FOR a client — the client may follow/log but not edit; changes propagate live), `name`, `slug`, `description`, `isActive` (default false), `targetRir` (default 2). Two unique indexes: slug is unique **per user** (`programs_user_slug_idx`), and globally unique for templates where `userId IS NULL` (`programs_template_slug_idx`).

**`programDays`** (`db/schema.ts:54-63`): `programId` (cascade delete), `name`, `dayCode`, `scheduledDay` (a weekday string, nullable), `sortOrder`.

**`programExercises`** (`db/schema.ts:65-79`): `programDayId` (cascade delete), `exerciseId` (FK to catalog), `sets`, `repRangeMin`, `repRangeMax`, `sortOrder`, `notes`, `supersetGroup`.

### Per-user ownership & the "followable" set

Reads live in `data/programs.ts`. The key predicate is `followableByMe(uid)` (`data/programs.ts:13-18`): a user's own **unassigned** programs (`userId = me AND assignedClientId IS NULL`) plus programs a coach assigned **to** them (`assignedClientId = me`). This deliberately **excludes** programs the user (as a trainer) authored FOR other clients — those live only in the coach console.

- `getPrograms()` (`data/programs.ts:20`) lists the followable set, owned first, and attaches `canEdit` (`userId === uid`) and `isAssigned` flags.
- `getProgramBySlug(slug)` (`data/programs.ts:36`) resolves a slug within the followable set, preferring an owned program if a slug collides, then delegates to `getProgramById`.
- `getProgramById(id)` (`data/programs.ts:51`) loads the program, its days ordered by `sortOrder`, and each day's exercises (joined to the catalog for `exerciseName`, `primaryMuscle`, `secondaryMuscles`, `type`) ordered by `sortOrder`. Returns `canEdit`, `isAssigned`, and the nested `days`.
- `getActiveProgram()` (`data/programs.ts:115`) finds the single `isActive` program within the follow-set (the user's own active program, or an assigned active one).

### Creating a program

`app/(app)/programs/new/page.tsx` is a plain form (name, description, target-RIR select) posting to `createProgram` (`app/actions/programs.ts:81`). The action validates with `programSchema` (`lib/validation.ts:77-81`), derives the slug with `slugify(name)`, inserts the program (inactive), and **redirects to `/programs/[slug]/edit`** to add days.

### Editing via the week builder

`app/(app)/programs/[slug]/edit/page.tsx` loads the program + `getAllExercises()` in parallel, `notFound()`s if missing, and **redirects assigned (non-editable) programs back to the read view** (`app/(app)/programs/[slug]/edit/page.tsx:39-40`). It renders `ProgramWeekBuilder` with `updateProgram` bound to the program id, plus an activation/danger-zone card (set-active, delete-with-confirm).

`ProgramWeekBuilder` (`components/shared/program-week-builder.tsx`) is the heart of editing. It presents the **whole week as a Mon–Sun grid** (`WEEKDAYS`, `program-week-builder.tsx:48-56`), mapping each program day onto its `scheduledDay`; the first day seen per weekday wins, and any day without a weekday (or colliding — possible with legacy data) is surfaced in an **"Unscheduled days"** section so nothing is silently dropped (`program-week-builder.tsx:121-133`). Each cell is either:

- a **`RestDayCard`** with an "Add training" button → `addTrainingDay` (`program-week-builder.tsx:241`), or
- a **`TrainingDayCard`** with an inline day-label editor (`renameProgramDay`), a remove-day confirm (`deleteProgramDay`), a list of `ExerciseRow`s, and an `ExercisePicker`.

`ExerciseRow` (`program-week-builder.tsx:438`) shows `sets × repMin-repMax`, an expandable inline edit form (sets/rep-range/notes/superset → `updateProgramExercise`), reorder up/down buttons (`reorderProgramExercise`), and delete (`deleteProgramExercise`). `ExercisePicker` (`program-week-builder.tsx:609`) is a client-side type-ahead over the passed-in catalog (name or muscle-group match, top 8) that calls `quickAddExercise` — inserting at sensible defaults (3 sets, 8–12 reps, `app/actions/programs.ts:460-468`). `UnscheduledDay` additionally offers a weekday `<Select>` → `setDayWeekday`.

The read-only detail view is `app/(app)/programs/[slug]/page.tsx`: header with Active / "From your coach" badges, an Edit button (only when `canEdit`), a `MuscleVolumeMap` for the whole program, and each day's exercise table.

### Slugs

`slugify` (`lib/slug.ts`) lowercases, replaces any non-alphanumeric run with `-`, and trims leading/trailing dashes. Slugs are recomputed on every `createProgram`/`updateProgram`/`duplicateProgram` from the name and are unique per user (not global), enforced by `programs_user_slug_idx`.

---

## Muscle targeting & body map

The body diagrams are rendered by `components/shared/muscle-volume-map.tsx` using `react-body-highlighter`'s `Model` for both anterior and posterior figures (`BodyDiagram`, `muscle-volume-map.tsx:41-69`). Two components share the taxonomy from `lib/muscles.ts`:

### `MuscleVolumeMap` — volume heat map

Given a flat list of `VolumeEntry { primary, secondary, sets }` (`muscle-volume-map.tsx:32-38`), it aggregates in a `useMemo` (`muscle-volume-map.tsx:87-120`):

1. Sum `sets` per **primary** muscle across all entries (`primaryTotals`).
2. Collect every **secondary** muscle into an `assist` set — but a muscle that is anyone's primary is removed from "assisting" (`muscle-volume-map.tsx:99-100`), so a muscle is never both worked and merely assisting.
3. Each worked muscle's total sets are mapped to a color tier via `bucket(sets)` — 0 sets → untrained, then 1–5 buckets at cutoffs ≤3/≤7/≤11/≤15/>15 (`muscle-volume-map.tsx:22-30`). Assisting muscles get the lightest "assist" tier.

The heat ramp is a 6-stop lime scale (`HIGHLIGHT_COLORS`, `muscle-volume-map.tsx:10-17`); `frequency` fed to the diagram is `bucket(sets) + 1` to shift past the index-0 assist color (`muscle-volume-map.tsx:110`). Below the figures it lists each worked muscle with a color swatch + set count, and an "Assisting:" line.

This map is fed the same way on both program surfaces — from `program.days.flatMap(d => d.exercises.map(e => ({ primary, secondary, sets })))` — in the detail view (`app/(app)/programs/[slug]/page.tsx:63-71`) and inside the builder (`program-week-builder.tsx:158-166`), so planned weekly volume lights up live as you edit.

### `MuscleHighlight` — single-exercise diagram

A compact, legend-free variant (`muscle-volume-map.tsx:180`) used on the exercise detail page. It takes `primary` and `secondary` slug arrays, dedupes them (primaries win over secondaries), and renders two `IExerciseData` layers with a two-tier `[secondary, primary]` color pair (`HIGHLIGHT_PAIR`, `muscle-volume-map.tsx:19`). Non-slug values are filtered out via `isMuscleSlug`.

---

## Server actions & data functions

### Mutations — `app/actions/exercises.ts`

| Action | Description |
| --- | --- |
| `createExercise(formData)` | Insert a private exercise (`userId = me`); validates `exerciseSchema`, derives `muscleGroup` from primary (`exercises.ts:24`). |
| `updateExercise(id, formData)` | Update an owned exercise; re-derives `muscleGroup` (`exercises.ts:35`). |
| `deleteExercise(id)` | Delete an owned exercise, refused if used in any program or with logged sets (`exercises.ts:50`). |

### Mutations — `app/actions/programs.ts`

| Action | Description |
| --- | --- |
| `createProgram(formData)` | Insert an inactive program, slugify name, redirect to its edit page (`programs.ts:81`). |
| `updateProgram(programId, formData)` | Update name/description/targetRir (+slug) on an owned program (`programs.ts:95`). |
| `deleteProgram(programId)` | Delete an owned program (cascades days/exercises); redirect to `/programs` (`programs.ts:113`). |
| `setActiveProgram(programId)` | Activate a *followable* program, deactivating the rest of the user's follow-set (`programs.ts:122`). |
| `addProgramDay` / `updateProgramDay` / `deleteProgramDay` | Manage days on a manageable program (`programs.ts:165`, `192`, `204`). |
| `addProgramExercise` / `updateProgramExercise` / `deleteProgramExercise` | Manage exercise slots; append at next `sortOrder`; update/delete verify the entry belongs to the program (`programs.ts:212`, `243`, `263`). |
| `reorderProgramExercise(entryId, programId, "up"/"down")` | Swap `sortOrder` with the adjacent entry in the same day (`programs.ts:276`). |
| `duplicateProgramDay(dayId, programId)` | Copy a day and its exercises within a program (`programs.ts:319`). |
| `addTrainingDay(programId, weekday)` | Week-grid: turn a rest weekday into a day (auto name/`dayCode`, `sortOrder` = weekday index); rejects a taken weekday (`programs.ts:386`). |
| `quickAddExercise(dayId, programId, exerciseId)` | Week-grid tap-to-add at defaults (3×8–12); verifies exercise visibility and day membership (`programs.ts:419`). |
| `renameProgramDay(dayId, programId, name)` | Inline-rename a day's label (`programs.ts:475`). |
| `setDayWeekday(dayId, programId, weekday)` | Assign an unscheduled day to a weekday, rejecting collisions (`programs.ts:495`). |
| `duplicateProgram(programId)` | Deep-copy a program (days + exercises) as "(copy)", redirect to its editor (`programs.ts:525`). |

Authorization helpers: `assertProgramOwned` (owner-only, for program-level details/activation), `assertProgramManageable` (owner **or** admin-on-template — lets the same builder serve users and admins, `programs.ts:39-54`), and `assertEntryInProgram` (entry belongs to the program). Mutations revalidate the relevant paths via `revalidateBuilder` (`programs.ts:73-79`), which also refreshes the admin and `/clients` (trainer) builder routes.

### Reads — `data/exercises.ts`

| Function | Description |
| --- | --- |
| `getExercises({search, muscleGroup, limit, offset})` | Paginated, filterable list scoped by `visibleTo`; returns `{ rows, total }`. |
| `getAllExercises()` | All visible exercises, unpaginated, for pickers/selects. |
| `getMuscleGroups()` | Distinct coarse muscle groups across visible exercises. |
| `getExerciseById(id)` | Single visible exercise + `isOwner`; null if not visible. |
| `getExerciseHistory(exerciseId)` | All logged sets for the exercise, grouped by completed session. |
| `getExerciseStats(exerciseId)` | Aggregate totals (sets, sessions, max weight/reps) + programs the exercise is used in. |

### Reads — `data/programs.ts`

| Function | Description |
| --- | --- |
| `getPrograms()` | The user's followable programs, owned first, with `canEdit`/`isAssigned`. |
| `getProgramBySlug(slug)` | Resolve a followable program by slug (owned preferred), then load it fully. |
| `getProgramById(id)` | Full nested program: days + their catalog-joined exercises. |
| `getAllProgramDays()` | Flat list of the user's program days (for day pickers). |
| `getActiveProgram()` | The single active program the user follows, fully loaded. |

---

## Key files

| File | Role |
| --- | --- |
| `db/schema.ts:4-79` | `exercises`, `programs`, `programDays`, `programExercises` tables. |
| `lib/muscles.ts` | Fine-grained muscle taxonomy, labels, fine↔coarse mapping, region grouping. |
| `lib/validation.ts` | Zod schemas (`exerciseSchema`, `programSchema`, day/exercise schemas) + `parseForm`. |
| `lib/slug.ts` | `slugify` for program slugs. |
| `data/exercises.ts` | Catalog reads, scoped by `visibleTo`. |
| `data/programs.ts` | Program reads, scoped by `followableByMe`. |
| `app/actions/exercises.ts` | Exercise create/update/delete (owner-only, delete guards). |
| `app/actions/programs.ts` | Program + day + exercise mutations, week-grid builder actions. |
| `app/(app)/exercises/page.tsx` | Catalog list: search/filter/pagination. |
| `app/(app)/exercises/[id]/page.tsx` | Exercise detail: stats, history, muscle map. |
| `app/(app)/programs/page.tsx` | Programs list (active/assigned badges, set-active, duplicate). |
| `app/(app)/programs/new/page.tsx` | New-program form → `createProgram`. |
| `app/(app)/programs/[slug]/page.tsx` | Program detail (read-only) + volume map. |
| `app/(app)/programs/[slug]/edit/page.tsx` | Program editor host (builder + activation/danger zone). |
| `components/shared/program-week-builder.tsx` | Mon–Sun week-grid builder (days, exercises, unscheduled). |
| `components/shared/muscle-volume-map.tsx` | `MuscleVolumeMap` (volume heat map) + `MuscleHighlight`. |
| `components/shared/muscle-select.tsx` | Primary/secondary muscle input for exercise forms. |
| `components/shared/add-exercise-dialog.tsx`, `exercise-actions.tsx` | Create / edit-delete exercise UIs. |
| `components/shared/search-input.tsx`, `muscle-group-filter.tsx`, `pagination.tsx` | Catalog list controls. |
| `db/import-exercises.ts` | Metadata-only catalog import (names + muscles; 1311 system exercises). |

---

## Related pages

- [`./data-model.md`](./data-model.md) — full table/relationship reference.
- [`./workout-logging.md`](./workout-logging.md) — how program days become logged sessions/sets.
- [`./progress-and-goals.md`](./progress-and-goals.md) — trained-volume body map, e1RM/analytics.
- [`./trainer-features.md`](./trainer-features.md) — coach-assigned programs and the client builder.
