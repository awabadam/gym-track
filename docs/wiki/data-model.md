# Data Model

[← Wiki Home](README.md)

The schema lives in two files:

- **`db/schema.ts`** — application tables (exercises, programs, sessions, …)
- **`db/auth-schema.ts`** — Better Auth tables (user, session, account, verification)

Both are registered with the Drizzle client in `db/index.ts`. Migrations are generated from these files into `db/migrations/` (see [Deployment](deployment.md)).

## Entity relationships

```
user (auth)
  └─< programs (userId)            ← owner-scoped
        └─< program_days
              └─< program_exercises ─► exercises (shared catalog)
  └─< sessions (userId)            ← owner-scoped
        ├─► program_days
        └─< session_sets ─► exercises (shared catalog)

exercises  ← system rows (userId NULL) shared read-only; custom rows owned per user
```

`─<` = one-to-many, `─►` = foreign-key reference.

## Application tables (`db/schema.ts`)

### `exercises` (shared catalog + custom)

The movement library, with a **copy-on-write ownership model** (added in the production-hardening pass, migration `0001`):

- **`userId IS NULL`** — a **system/recommended** exercise from the seeded catalog: visible to everyone, not editable by regular users. These are curated through the [admin console](routes.md) (`/admin/exercises`); a future questionnaire will surface them.
- **`userId = <someone>`** — a user's **private custom** exercise: only that user sees and manages it.

Seeded system exercises are created on deploy (see [Deployment](deployment.md#seeding)). All catalog reads are scoped to "visible to me" (`userId IS NULL OR userId = me`) — see [Data Layer](data-layer.md).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `defaultRandom()` |
| `userId` | text, **nullable** | `NULL` = shared system exercise; non-`NULL` = owner of a custom exercise |
| `name` | text, not null | e.g. "Bench Press" |
| `muscleGroup` | text | e.g. `chest`, `quads` — drives [upper/lower](progression-engine.md) classification and filters |
| `type` | text | `main` / `compound` / `iso` / `core` |
| `notes` | text | |
| `createdAt` | timestamp | `defaultNow()` |

### `programs` (per-user, or a shared template)

A training blueprint. Owned by one user, **or** a shared "recommended" template when `userId IS NULL` (managed via the admin console, mirroring the exercise catalog).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `userId` | text, **nullable** | Owner's Better Auth user id; `NULL` = a shared recommended template. (Code comment says "Clerk" — it's the Better Auth id; the app migrated providers.) |
| `name` | text, not null | |
| `slug` | text, not null | URL identifier, generated via [`lib/slug.ts`](data-layer.md) |
| `description` | text | |
| `isActive` | boolean, default false | Only one active program per user (enforced in the `setActiveProgram` action, not by a constraint) |
| `targetRir` | integer, not null, default 2 | Reps-in-reserve target feeding the [progression engine](progression-engine.md) |
| `createdAt` | timestamp | |

**Unique index `programs_user_slug_idx` on `(userId, slug)`** — slugs are unique *per user*, so two users can both have a `push-pull-legs`. A second **partial unique index `programs_template_slug_idx` on `(slug) WHERE userId IS NULL`** keeps recommended-template slugs globally unique.

### `program_days`

A day within a program (e.g. "Upper A").

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `programId` | uuid → `programs.id` | **cascade delete** |
| `name` | text, not null | "Upper A" |
| `dayCode` | text, not null | Short code shown in the UI, e.g. `UA` |
| `scheduledDay` | text | Weekday like `monday` (drives the dashboard week view); nullable |
| `sortOrder` | integer, not null | Ordering within the program |

### `program_exercises`

An exercise slotted into a day, with its prescription.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `programDayId` | uuid → `program_days.id` | **cascade delete** |
| `exerciseId` | uuid → `exercises.id` | references the shared catalog |
| `sets` | integer, not null | prescribed set count |
| `repRangeMin` / `repRangeMax` | integer, not null | the target rep window (double progression range) |
| `sortOrder` | integer, not null | order within the day |
| `notes` | text | |
| `supersetGroup` | text | exercises sharing a value are supersetted (e.g. `A`) |

### `sessions` (per-user)

One logged (or in-progress) workout.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `userId` | text, not null | Owner |
| `programDayId` | uuid → `program_days.id` | which day this session is an instance of |
| `date` | text, not null | `YYYY-MM-DD` (stored as text to avoid timezone drift) |
| `status` | text, not null, default `in_progress` | `in_progress` → `completed` |
| `notes` | text | |
| `startedAt` | timestamp | `defaultNow()` |
| `completedAt` | timestamp | set when completed |

### `session_sets`

One logged set inside a session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sessionId` | uuid → `sessions.id` | **cascade delete** |
| `exerciseId` | uuid → `exercises.id` | |
| `setNumber` | integer, not null | 1-based; `(session, exercise, setNumber)` is the logical key the `logSet` action upserts on |
| `weight` | real, not null | kg |
| `reps` | integer, not null | |
| `rir` | integer | reps in reserve (nullable — missing RIR is treated as "met target" by progression) |
| `notes` | text | |
| `createdAt` | timestamp | |

## Auth tables

Standard Better Auth Postgres schema (`db/auth-schema.ts`). See [Auth](auth.md) for how they're used.

- **`user`** — `id` (text PK), `name`, `email` (unique), `emailVerified`, `image`, timestamps, plus the admin-plugin columns `role` (nullable; `NULL`/`"user"` vs `"admin"`), `banned`, `banReason`, `banExpires` (migration `0002`).
- **`session`** — `id`, `expiresAt`, `token` (unique), `ipAddress`, `userAgent`, `impersonatedBy` (admin-plugin), `userId` → `user.id` (cascade). Indexed on `userId`.
- **`account`** — credential/provider rows; holds the hashed `password` for email+password. `userId` → `user.id` (cascade). Indexed on `userId`.
- **`verification`** — token store for verification flows. Indexed on `identifier`.

Drizzle `relations()` wire `user → sessions/accounts` for query convenience.

## Notable modelling choices

- **Dates as text (`YYYY-MM-DD`).** Session dates are stored as strings and compared lexically (works because of ISO ordering). This sidesteps timezone shifts — see [`lib/format.ts`](data-layer.md) and [`data/sessions.ts`](data-layer.md) week math.
- **Cascade deletes** on the structural edges (`programs → days → exercises`, `sessions → sets`) so deleting a parent cleans up children. Catalog references (`*.exerciseId → exercises.id`) do **not** cascade, and the [`deleteExercise` action](data-layer.md) refuses to delete an exercise that's in use.
- **Active program is app-enforced**, not a DB constraint: `setActiveProgram` deactivates the user's other programs in the same transaction-like sequence.
- **Exercise ownership is app-enforced** via the nullable `userId`: `NULL` system exercises are locked (no app path mutates them), and custom exercises are guarded by `assertExerciseOwned`. There's no DB constraint distinguishing the two — see [Data Layer](data-layer.md).
