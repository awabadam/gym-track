# Production-Readiness Plan

A living tracker for hardening GymTrack for production. Updated as work progresses.

**Status legend:** ☐ todo · ◐ in progress · ☑ done · ⏸ paused

**Current state (last updated this session):** Slices 1–3 complete and verified (typecheck + lint clean). Slice 4 (auth hardening) **paused at the user's request** — pick back up here. Nothing has been committed yet; all changes are in the working tree. The slice-1 migration (`0001`) still needs to be applied to any live DB (runs automatically on deploy boot).

Full context for each gap lives in the [wiki](wiki/README.md). This doc tracks the *work*.

---

## Tier 1 (correctness & security)

The four items the user approved tackling first, in order. Each shipped as its own reviewable slice.

### Slice 1 — ☑ Fix exercise-action security hole (#1)

**Problem:** `app/actions/exercises.ts` had no `requireUserId()` — any signed-in user could edit/delete the *shared* catalog, affecting everyone.

**Decision:** Copy-on-write model (not admin-gating, since the UI lets every user "Add Exercise"). Add a nullable `exercises.userId`:
- `NULL` = system/seed exercise → visible to all, editable/deletable by no one.
- non-`NULL` = a user's private custom exercise → only they see/manage it.

**Steps:**
- ☑ `db/schema.ts`: add nullable `userId` to `exercises`
- ☑ Generate migration → `db/migrations/0001_add_exercise_user_id.sql`
- ☑ `data/exercises.ts`: scope reads to visible exercises (`userId IS NULL OR userId = me`); `requireUserId()` in `getExercises`, `getAllExercises`, `getMuscleGroups`, `getExerciseById`; `getExerciseById` returns an `isOwner` flag
- ☑ `app/actions/exercises.ts`: `requireUserId()` + `assertExerciseOwned` in `create`/`update`/`delete`; stamp `userId` on create; kept the in-use guards on delete
- ☑ `app/exercises/[id]/page.tsx`: render `<ExerciseActions>` only when `isOwner`
- ☑ Typecheck (clean) / lint (only a pre-existing unused-import warning)
- ◐ Check in with user
- ⚠ **Migration not yet applied to any DB** — runs on deploy boot via `db:migrate`; for local, run `npx dotenv -e .env.local -- npm run db:migrate`

**Migration note:** existing rows get `userId = NULL` → they become system exercises (correct — they're the seeded catalog).

### Slice 2 — ☑ Input validation on all server actions (#2)

**Problem:** actions trust `formData.get(...) as string` / `parseInt(...)` — empty names and `NaN` can reach `NOT NULL` columns.

**Done:**
- ☑ Added `zod` (v4.4.3)
- ☑ `lib/validation.ts`: shared schemas + `parseForm(schema, formData)` / `parse(schema, data)` helpers that throw a clean `field: message` error
- ☑ Applied across `actions/exercises.ts`, `actions/programs.ts`, `actions/sessions.ts` — names (non-empty, bounded), muscle-group/type/weekday enums, sets ≥1, rep ranges (max ≥ min), targetRir 0–5, RIR/weight/reps bounds, UUIDs, `YYYY-MM-DD` date
- ☑ Typecheck clean / lint clean (also removed a stale unused import)
- ◐ Check in with user

### Slice 3 — ☑ Error & not-found boundaries (#3)

**Problem:** no `error.tsx` / `not-found.tsx`; an uncaught render error or bad URL surfaced as a raw crash screen.

**Done:**
- ☑ Read Next 16 error docs — note: 16.2+ error boundaries receive **`unstable_retry`** (not the old `reset`); using it
- ☑ `app/error.tsx` (client) — brutalist fallback, logs error, retry + go-home
- ☑ `app/global-error.tsx` (client) — last-resort boundary with own `<html>/<body>`, inline-styled so it renders even if CSS failed
- ☑ `app/not-found.tsx` — on-brand 404
- ☑ Page-level resource loads already use `notFound()` consistently (program/exercise/session); `workout`/`progress` intentionally show a friendly "no active program" state, not a 404 — left as-is. Action ownership failures stay as thrown errors (correct for the mutation path)
- ☑ Typecheck / lint clean
- ◐ Check in with user

**Observability hook:** both boundaries have a `TODO(observability)` where an error-reporting service should be wired (tier 2).

### Slice 4 — ⏸ Auth hardening (#4) — PAUSED

**Problem:** Better Auth missing `trustedOrigins` (CSRF), no email verification / password reset, rate-limit not explicit.

**Paused at user's request** before starting. When resumed, intended scope:
- ☐ Read Better Auth config docs before writing
- ☐ `lib/auth.ts`: set `trustedOrigins` from `BETTER_AUTH_URL`; confirm/configure rate limiting (config-only hardening)
- ☐ Update `.env.example` / [wiki/auth.md](wiki/auth.md) if config changes
- ☐ Typecheck / lint · check in

**Open decisions (need user input / infra):**
- Email verification and password reset both require an email-sending provider (Resend/SMTP). Recommendation was to **defer** these email-dependent flows until a provider is chosen, and do config-only hardening now.

---

## Deferred (tier 2+ — not in this pass)

Captured so they aren't lost; revisit after tier 1.

- ☑ **🔒 SECURITY — `startSession` / `startPastSession` day-ownership IDOR (FIXED).** Found during slice 2. Both now validate the `programDayId` as a UUID and call `assertProgramDayOwned` (a `programDays → programs.userId` join) before inserting a session, so a user can't start a session against another user's day.

- **Tests** — wire up `vitest`; unit-test `lib/progression.ts` + `lib/calculations.ts` (highest value-per-effort).
- **CI** — lint + typecheck + test gate on push.
- **Security headers** — populate `next.config.ts` (HSTS, X-Frame-Options, disable `poweredByHeader`).
- **Observability** — error tracking, a health-check endpoint, structured logs.
- **Migrate/seed on boot** — guard against concurrent-boot races; note schema rollback isn't automatic ([wiki/deployment.md](wiki/deployment.md)).
- **N+1 over Neon HTTP** — `getProgressForProgram`, `getProgramById` fire a query per item.
- **Account management** — password reset, delete account, data export.
- **Admin path for recommended exercises** — the shared (`userId IS NULL`) exercises are "recommended" exercises that will be surfaced from a user questionnaire. After production hardening, build an admin-only path to manage this recommended catalog (CRUD on system exercises), since slice 1 intentionally locked shared exercises so no regular user can mutate them. Likely needs a user role/admin concept (none exists today).
