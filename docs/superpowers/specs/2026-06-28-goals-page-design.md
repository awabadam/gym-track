# Goals Page — Design

**Date:** 2026-06-28
**Status:** Approved; building the Strength slice first.

## Summary

A new `/goals` page where lifters set and track goals across four types. The
organizing insight: the app already derives an **estimated 1RM** from logged
sets, so most goal progress can be computed for free. We layer on top of that a
**true (tested) 1RM** that the user enters by hand — a deliberate, celebrated
action, distinct from the always-on estimate.

Two faces of one idea per lift: a **PR** is your current best; a **goal** is a
target you chase against it.

## Goal types

| Type | Target | Progress source | Manual? |
|------|--------|-----------------|---------|
| **strength** | 1RM (kg) for a lift | true 1RM if recorded, else estimated 1RM | 1RM entry is manual + ceremonial; goal is manual |
| **consistency** | sessions per week/month | session log | auto, manual override |
| **volume** | sets/week for a muscle | muscle-volume data (already on Progress) | auto, manual override |
| **bodyweight** | target bodyweight (kg) | latest weigh-in | weigh-ins manual (new table) |

### The two 1RMs (core distinction)

- **Estimated 1RM** — Epley estimate from any logged set (`lib/calculations.ts`,
  already shown on Progress). Background, always-on, "you're trending here."
- **True 1RM** — a max actually tested, entered by hand via a special flow with a
  small celebration. The headline PR per lift; a strength **goal** targets it.

## Data model

One `goals` table with a `type` discriminator + a `personal_records` table for
manual records (headlined by the true 1RM). `bodyweight_logs` is added in the
bodyweight slice only.

### Why type-specific columns are nullable (and how integrity is kept)

In a single polymorphic `goals` table, `exercise_id` only applies to `strength`
rows and `muscle` only to `volume` rows — so neither can be a global `NOT NULL`
(a consistency row legitimately has both empty). To avoid the resulting "nullable
but actually required" smell, a **`CHECK` constraint enforces the right fields
per type**, so the DB still rejects malformed rows. This keeps one lean table
while preserving correctness — matching the repo's existing single-table +
app-level (Zod) validation style.

### `goals`

- `id` uuid pk
- `user_id` text not null
- `type` text not null — `strength | consistency | volume | bodyweight`
- `exercise_id` uuid → exercises (strength only)
- `muscle` text — `lib/muscles` slug (volume only)
- `target_value` real not null — natural unit per type (kg / sessions / sets / kg)
- `period` text — `week | month` (consistency only)
- `target_date` text — optional ISO deadline
- `status` text not null default `active` — `active | achieved | archived`
- `achieved_at` timestamp
- `created_at` timestamp default now
- **CHECK** `goals_type_fields_ck`: per-type field presence/absence
- **partial unique** `(user_id, exercise_id)` where `type='strength' and status='active'` — at most one active 1RM goal per lift

### `personal_records`

History of manually entered records (multiple rows per lift = PR progression).

- `id` uuid pk
- `user_id` text not null
- `exercise_id` uuid not null → exercises
- `kind` text not null default `one_rep_max` (room for `max_reps`, etc.)
- `value` real not null (kg for a 1RM)
- `reps` integer (optional context; 1 for a true 1RM)
- `achieved_on` text not null — ISO date the lift happened
- `note` text
- `created_at` timestamp default now

Current true 1RM for a lift = `max(value)` over its `one_rep_max` records.

## Strength slice (building now)

### Schema & migration
Add `goals` + `personal_records` to `db/schema.ts`; `drizzle-kit generate`. The
CHECK enumerates all four types up front so later slices don't churn it. `muscle`
/ `period` columns are created now (cheap, nullable) though only strength is wired
up.

### Validation (`lib/validation.ts`, Zod)
- `oneRepMaxSchema`: `{ exerciseId, value>0, achievedOn(isoDate), note? }`
- `strengthGoalSchema`: `{ exerciseId, targetValue>0, targetDate? }`

### Data (`data/goals.ts`)
- `getStrengthData()` → for each tracked lift (has a 1RM record and/or active
  goal): `{ exerciseId, exerciseName, currentOneRm, oneRmHistory, estimatedOneRm,
  goal, progressPct }`, plus `exerciseOptions` (all visible exercises) for the
  picker. Best estimated 1RM per exercise is computed from the user's
  `session_sets` via `bestEstimated1RM`.

### Actions (`app/actions/goals.ts`, "use server")
- `logOneRepMax(input)` — insert a record; if it meets/exceeds an active strength
  goal for that lift, mark the goal `achieved`. `revalidatePath('/goals')`.
- `setStrengthGoal(input)` — upsert the active strength goal for (user, lift).
- `deleteStrengthGoal(id)` / `deleteOneRepMax(id)` — ownership-checked deletes.

### UI
- `app/(app)/goals/page.tsx` — server component; `PageHeader` + Strength block
  styled like Progress/dashboard (brutalist `Block`s). Each lift row shows the
  big **current 1RM**, the small estimated 1RM ("trending"), and the goal target
  with a progress bar + optional deadline.
- `components/shared/log-one-rep-max-dialog.tsx` (client) — the special flow:
  pick lift (or fixed), value, date, note; on success a celebratory "NEW 1RM"
  state before closing. Uses `useTransition` + the server action, swallowing
  `NEXT_REDIRECT` (repo pattern).
- `components/shared/strength-goal-dialog.tsx` (client) — set/edit a target.

### Navigation
Add **Goals** to the sidebar **TRAIN** group (next to Progress) and a quick link
on the dashboard. Mobile bottom-nav placement is deferred (reachable via
dashboard for now) to keep the slice tight.

## Later slices (not now)
2. **Consistency** — derive sessions/week from the log; target + override.
3. **Volume** — reuse muscle-volume; target sets/week per muscle.
4. **Bodyweight** — new `bodyweight_logs` weigh-in table; goal vs latest weigh-in.

## Non-goals (YAGNI)
- No unit switching (kg throughout, matching the app).
- No social/sharing, no notifications on achievement (beyond in-page celebration)
  in v1.
