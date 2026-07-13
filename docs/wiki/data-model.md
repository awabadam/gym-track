# Data Model & Database

This app persists all data in **PostgreSQL (Neon serverless)** and accesses it through **Drizzle ORM**. The schema is split across two files: the application schema (`db/schema.ts`) and the Better Auth schema (`db/auth-schema.ts`). The DB client is a single shared instance built over Neon's HTTP driver.

The client is constructed in `db/index.ts:1-7`:

```ts
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema: { ...schema, ...authSchema } });
```

Drizzle Kit config (`drizzle.config.ts:3-10`) points at both schema files, emits migrations to `./db/migrations`, and uses the `postgresql` dialect with `DATABASE_URL` for credentials.

**Cross-user identity note:** all user references are stored as `text` user IDs matching Better Auth's `user.id` (also `text`). These `user_id`-style columns in the app schema are **not** declared as foreign keys to `user` — they are logical references only (some code comments still say "Clerk user id", but the app runs on Better Auth). Foreign keys are only declared between application tables (see each table below).

---

## Tables

### Auth domain (`db/auth-schema.ts`)

Better Auth's standard tables plus admin-plugin fields.

**`user`** (`db/auth-schema.ts:4-21`) — application user accounts.
- `id` `text` PK
- `name` `text` NOT NULL, `email` `text` NOT NULL UNIQUE, `emailVerified` `boolean` default false NOT NULL, `image` `text`
- `role` `text` (nullable — admin plugin; null = default role until promoted)
- `banned` `boolean` default false, `banReason` `text`, `banExpires` `timestamp`
- `createdAt` / `updatedAt` `timestamp` NOT NULL (`updatedAt` auto-set via `$onUpdate`)

**`session`** (`db/auth-schema.ts:23-42`) — auth login sessions (distinct from workout `sessions`).
- `id` `text` PK, `expiresAt` `timestamp` NOT NULL, `token` `text` NOT NULL UNIQUE
- `ipAddress` `text`, `userAgent` `text`, `impersonatedBy` `text` (admin id when impersonating)
- `userId` `text` NOT NULL → `user.id` **ON DELETE CASCADE**
- Index `session_userId_idx` on `userId`

**`account`** (`db/auth-schema.ts:44-66`) — credential/OAuth links per user (holds hashed `password` for email+password).
- `id` `text` PK, `accountId` `text` NOT NULL, `providerId` `text` NOT NULL
- `userId` `text` NOT NULL → `user.id` **ON DELETE CASCADE**
- `accessToken`, `refreshToken`, `idToken`, `scope`, `password` (`text`); token-expiry timestamps
- Index `account_userId_idx` on `userId`

**`verification`** (`db/auth-schema.ts:68-82`) — email/verification tokens.
- `id` `text` PK, `identifier` `text` NOT NULL, `value` `text` NOT NULL, `expiresAt` `timestamp` NOT NULL, timestamps
- Index `verification_identifier_idx` on `identifier`

Relations (`db/auth-schema.ts:84-101`): `user` has many `session` and many `account`; each belongs to one `user`.

### Exercises domain (`db/schema.ts`)

**`exercises`** (`db/schema.ts:4-21`) — the exercise catalog (shared + per-user custom).
- `id` `uuid` PK default random
- `userId` `text` (nullable) — **NULL = shared "system" exercise** (seeded/imported, editable by no one); non-NULL = a user's private exercise
- `name` `text` NOT NULL
- `muscleGroup` `text` — legacy coarse 10-group bucket, derived from `primaryMuscle` on write (used for progression `isUpperBody` + progress grouping)
- `primaryMuscle` `text` — fine-grained anatomical slug (see `lib/muscles.ts`)
- `secondaryMuscles` `text[]` — array of fine slugs
- `type` `text` (`main`/`compound`/`iso`/`core`), `notes` `text`, `createdAt` `timestamp` default now

### Programs domain (`db/schema.ts`)

**`programs`** (`db/schema.ts:23-52`) — a training program (per-user, or a shared template).
- `id` `uuid` PK
- `userId` `text` (nullable) — NULL = shared "recommended" template (admin-managed); non-NULL = user's private program
- `assignedClientId` `text` (nullable) — when set, program is authored by `userId` (a trainer) and assigned to this client; client follows but can't edit
- `name` `text` NOT NULL, `slug` `text` NOT NULL, `description` `text`
- `isActive` `boolean` default false
- `targetRir` `integer` NOT NULL default 2 (reps-in-reserve target feeding progression)
- `createdAt` `timestamp` default now
- Indexes: `programs_user_slug_idx` UNIQUE on (`userId`, `slug`); `programs_template_slug_idx` UNIQUE on (`slug`) WHERE `userId IS NULL` (templates need globally-unique slugs)

**`program_days`** (`db/schema.ts:54-63`) — a day within a program (e.g. "Upper A").
- `id` `uuid` PK
- `programId` `uuid` NOT NULL → `programs.id` **ON DELETE CASCADE**
- `name` `text` NOT NULL, `dayCode` `text` NOT NULL, `scheduledDay` `text` (nullable weekday), `sortOrder` `integer` NOT NULL

**`program_exercises`** (`db/schema.ts:65-79`) — an exercise slotted into a program day.
- `id` `uuid` PK
- `programDayId` `uuid` NOT NULL → `program_days.id` **ON DELETE CASCADE**
- `exerciseId` `uuid` NOT NULL → `exercises.id` (no cascade)
- `sets` `integer` NOT NULL, `repRangeMin` `integer` NOT NULL, `repRangeMax` `integer` NOT NULL
- `sortOrder` `integer` NOT NULL, `notes` `text`, `supersetGroup` `text` (shared value = supersetted)

### Sessions / logging domain (`db/schema.ts`)

**`sessions`** (`db/schema.ts:81-93`) — a logged (or in-progress) workout, private per user.
- `id` `uuid` PK
- `userId` `text` NOT NULL (owner)
- `programDayId` `uuid` NOT NULL → `program_days.id` (no cascade)
- `date` `text` NOT NULL (`YYYY-MM-DD`, stored as text to avoid timezone drift)
- `status` `text` NOT NULL default `"in_progress"` (→ `completed`), `notes` `text`
- `startedAt` `timestamp` default now, `completedAt` `timestamp`

**`session_sets`** (`db/schema.ts:150-164`) — a single logged set within a session.
- `id` `uuid` PK
- `sessionId` `uuid` NOT NULL → `sessions.id` **ON DELETE CASCADE**
- `exerciseId` `uuid` NOT NULL → `exercises.id` (no cascade)
- `setNumber` `integer` NOT NULL, `weight` `real` NOT NULL (kg), `reps` `integer` NOT NULL, `rir` `integer` (nullable), `notes` `text`, `createdAt` `timestamp` default now

### Goals domain (`db/schema.ts`)

**`personal_records`** (`db/schema.ts:202-215`) — manually-entered tested PRs (history kept, multiple rows per lift).
- `id` `uuid` PK, `userId` `text` NOT NULL
- `exerciseId` `uuid` NOT NULL → `exercises.id` (no cascade)
- `kind` `text` NOT NULL default `"one_rep_max"`
- `value` `real` NOT NULL (kg), `reps` `integer` (nullable context), `achievedOn` `text` NOT NULL (ISO date), `note` `text`, `createdAt` `timestamp` default now

**`goals`** (`db/schema.ts:222-254`) — one lean table for four goal types, discriminated by `type`.
- `id` `uuid` PK, `userId` `text` NOT NULL
- `type` `text` NOT NULL — `strength` | `consistency` | `volume` | `bodyweight`
- `exerciseId` `uuid` → `exercises.id` (strength only)
- `muscle` `text` (fine slug, volume only)
- `targetValue` `real` NOT NULL (unit depends on type: 1RM kg / sessions per period / sets-per-week / bodyweight kg)
- `period` `text` (week | month; consistency only), `targetDate` `text` (optional ISO), `status` `text` NOT NULL default `"active"` (active | achieved | archived)
- `achievedAt` `timestamp`, `createdAt` `timestamp` default now
- **CHECK** `goals_type_fields_ck` enforces the correct type-specific columns are set/null per `type`
- Index `goals_active_strength_idx` UNIQUE on (`userId`, `exerciseId`) WHERE `type='strength' AND status='active'` (at most one active 1RM goal per lift)

### Trainer domain (`db/schema.ts`)

**`trainer_applications`** (`db/schema.ts:95-117`) — a user's request to become a trainer.
- `id` `uuid` PK, `userId` `text` NOT NULL, `status` `text` NOT NULL default `"pending"` (pending | approved | declined), `note` `text`, `reviewedBy` `text`, `reviewedAt` `timestamp`, `createdAt` `timestamp` default now
- Index `trainer_applications_pending_user_idx` UNIQUE on (`userId`) WHERE `status='pending'` (at most one open application)

**`trainers`** (`db/schema.ts:119-125`) — one row per approved trainer.
- `userId` `text` PK (the trainer's user id)
- `inviteCode` `text` NOT NULL UNIQUE, `createdAt` `timestamp` default now

**`trainer_clients`** (`db/schema.ts:127-148`) — trainer↔client coaching links (history kept).
- `id` `uuid` PK, `trainerId` `text` NOT NULL (matches `trainers.userId`), `clientId` `text` NOT NULL
- `status` `text` NOT NULL default `"active"` (active | ended), `startedAt` / `endedAt` `timestamp`
- Index `trainer_clients_active_client_idx` UNIQUE on (`clientId`) WHERE `status='active'` (a client has at most one active trainer)

**`coach_notes`** (`db/schema.ts:182-195`) — trainer notes about a client.
- `id` `uuid` PK, `trainerId` `text` NOT NULL, `clientId` `text` NOT NULL
- `sessionId` `uuid` → `sessions.id` **ON DELETE SET NULL** (optional note attached to a logged workout; set-null keeps the note as history if the session is deleted)
- `body` `text` NOT NULL, `createdAt` `timestamp` default now

### Notifications domain (`db/schema.ts`)

**`notifications`** (`db/schema.ts:166-180`) — in-app notifications.
- `id` `uuid` PK, `userId` `text` NOT NULL (recipient)
- `type` `text` NOT NULL (e.g. coach_note, program_assigned, client_joined, client_left, workout_logged)
- `title` `text` NOT NULL, `body` `text`, `linkPath` `text`, `readAt` `timestamp` (NULL = unread), `createdAt` `timestamp` default now

---

## Entity relationships

Declared foreign keys (Drizzle `.references()`) connect the application tables; user/trainer/client links are logical `text` references to `user.id`.

```
user (auth)
 ├── session         (FK userId → user.id, cascade)
 ├── account         (FK userId → user.id, cascade)
 │
 ├──(logical userId)── programs ──< program_days ──< program_exercises >── exercises
 │                        │                                                    ^
 │                        │  (programs.assignedClientId → a client user id)    │
 │                        │                                                    │
 ├──(logical userId)── sessions (FK programDayId → program_days.id)            │
 │                        └──< session_sets (FK sessionId, cascade) ──────────┘ (FK exerciseId)
 │
 ├──(logical userId)── personal_records >── exercises
 ├──(logical userId)── goals            >── exercises (strength only)
 ├──(logical userId)── notifications
 │
 └── trainer flow:
       trainer_applications (userId)  →  trainers (userId PK, inviteCode)
       trainers ──(trainerId)── trainer_clients ──(clientId)── client user
       coach_notes (trainerId, clientId, optional sessionId → sessions, set null)
```

`──<` = one-to-many, `>──` / `→` = foreign-key or logical reference.

**Ownership chain for logging:** a **user** owns **programs**; each program has **program_days**; each day has **program_exercises** pointing at catalog **exercises**. When training, the user creates a **session** against a `program_day` and records one **session_set** row per set, each pointing at an **exercise**. Deleting a program cascades to its days and program-exercises; deleting a session cascades to its session-sets. Foreign keys onto `exercises` do **not** cascade, protecting catalog integrity.

**Exercise catalog sharing:** `exercises.userId IS NULL` marks a shared/system exercise usable by everyone; a non-NULL `userId` is a private custom exercise. The same NULL-owner convention marks shared "recommended" `programs` templates.

**Trainer/client:** a `trainers` row (keyed by user id, with an `inviteCode`) links to clients through `trainer_clients` (partial-unique so a client has one active coach). A trainer can author a `programs` row and set `assignedClientId` to push it to a client, and can leave `coach_notes` (optionally attached to a specific `session`).

---

## Scripts & migrations

Migrations live in `db/migrations/` with metadata in `db/migrations/meta/_journal.json`. There are **11 migrations** (idx 0–10):

| idx | tag |
| --- | --- |
| 0 | `0000_init` |
| 1 | `0001_add_exercise_user_id` |
| 2 | `0002_secret_siren` |
| 3 | `0003_volatile_the_initiative` |
| 4 | `0004_large_salo` |
| 5 | `0005_flashy_mongoose` |
| 6 | `0006_lowly_frog_thor` |
| 7 | `0007_redundant_blue_blade` |
| 8 | `0008_glossy_xorn` |
| 9 | `0009_messy_lady_bullseye` |
| 10 | `0010_bitter_miss_america` |

The latest migration `db/migrations/0010_bitter_miss_america.sql` creates the **`goals`** and **`personal_records`** tables, adds their FKs to `exercises`, and the partial-unique `goals_active_strength_idx`.

### Scripts

| Script | Purpose | Command |
| --- | --- | --- |
| `db/migrate.ts` | Applies pending migrations over Neon HTTP (`migrate(...)` on `./db/migrations`). | `npm run db:migrate` (locally `npx dotenv -e .env.local -- npm run db:migrate`) |
| `db/seed.ts` | Seeds the shared exercise catalog (23 hand-curated exercises with muscle mappings). Idempotent — inserts only names not already present. | `npm run db:seed` |
| `db/import-exercises.ts` | Fetches a public exercises dataset and imports **only** names + muscle targeting (no prose/media), mapping their muscle vocab → fine slugs (`lib/muscles.ts`). Skips cardio/unmappable rows; dedups case-insensitively; chunks inserts. `IMPORT_RESET=1` first deletes prior imported system rows (preserves curated + custom). | `npm run db:import-exercises` |
| `db/seed-program.ts` | Exports `seedProgramForUser(userId)` — creates a personal copy of the default "Maximal Growth — Upper/Lower 4 Days" program (days + exercises wired to the catalog by name). Called from `lib/onboarding.ts` on first sign-in; not a CLI script. | (imported at runtime, no npm script) |
| `db/backfill-slugs.ts` | One-off helper: adds `programs.slug`, backfills from `name` via regex, sets NOT NULL, and creates a unique index. Runs raw SQL over Neon. | `npx tsx db/backfill-slugs.ts` (with env loaded) |

`db:generate` (`drizzle-kit generate`) produces new migrations from the schema. `db/seed-program.ts` (runtime import) and `db/backfill-slugs.ts` (run directly with `tsx`) have no npm scripts.

### Referenced libs

- `lib/slug.ts` — `slugify(name)` lowercases and hyphenates program slugs; used by `app/actions/{programs,admin,trainer}.ts`.
- `lib/muscles.ts` — the fine-grained muscle taxonomy (16 slugs) plus `fineToCoarse` / `coarseToFine` mappers to the legacy 10-group buckets. Backs `exercises.primaryMuscle`/`secondaryMuscles`, `goals.muscle`, and the body diagram.

---

## Key files

| Path | Role |
| --- | --- |
| `db/schema.ts` | Main application schema — all app tables, indexes, checks |
| `db/auth-schema.ts` | Better Auth tables (`user`, `session`, `account`, `verification`) + relations |
| `db/index.ts` | Shared Drizzle client over Neon HTTP |
| `drizzle.config.ts` | Drizzle Kit config (schema paths, migrations out dir, dialect) |
| `db/migrate.ts` | Migration runner |
| `db/seed.ts` | Curated exercise-catalog seeder |
| `db/import-exercises.ts` | Bulk exercise import (names + muscles only) |
| `db/seed-program.ts` | Per-user default-program seeding (runtime) |
| `db/backfill-slugs.ts` | One-off `programs.slug` backfill |
| `db/migrations/` | SQL migrations + `meta/_journal.json` |
| `lib/slug.ts` | Program slug generation |
| `lib/muscles.ts` | Fine/coarse muscle taxonomy |

---

## Related pages

- [Architecture](./architecture.md)
- [Auth & roles](./auth-and-roles.md)
- [Programs & exercises](./programs-and-exercises.md)
- [Workout logging](./workout-logging.md)
