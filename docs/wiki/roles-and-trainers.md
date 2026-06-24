# Roles & Trainers (target model)

[← Wiki Home](README.md)

> **Status: planned, not yet built.** This page is the agreed target design for GymTrack's multi-role model. It builds on the existing role system (Better Auth `admin` plugin — see [Auth](auth.md#admin-roles)) and the per-user / shared-template data model (see [Data Model](data-model.md)). Today only `user` and `admin` exist; the **trainer** role and everything below is upcoming work tracked in the [Production-Readiness Plan](../production-readiness-plan.md#roadmap--trainers--multi-role).

GymTrack supports three kinds of account, each a **superset** of the previous:

| Role | Can do |
|------|--------|
| **User** (solo) | Create/manage their own programs, log workouts, track progress, use the admin-curated recommended catalog. *(This is the app today.)* |
| **Trainer** | Everything a user can (their own workouts), **plus** a roster of clients: build/assign programs to them and monitor their progress. |
| **Admin** | Everything, plus manage all users **and** trainers and maintain the app/catalog. |

One `role` per account (`user` → `trainer` → `admin`). A trainer is a full user who also coaches; there is no separate "trainer-only" account and no trainer+admin combo.

## Becoming a trainer

A user submits a **trainer application**. Admins review an **approval queue** in the [admin console](routes.md); on approval the account's role becomes `trainer` and it receives a unique **invite code**. (Gatekept — users can't self-promote.)

## Trainer ↔ client link

- A client joins a trainer via the trainer's **invite link / code** — either while signing up ("registering through" a trainer) or later as an existing solo user entering the code.
- **At most one active trainer at a time.** Switching ends the current link and opens a new one; a user is never permanently tied to one trainer.
- The link is **time-windowed** and retained as history: `trainer_clients(trainerId, clientId, status, startedAt, endedAt)`.

## Assigned programs

A trainer builds a program **for a specific client**. The program is authored and owned by the trainer (`userId = trainer`) and carries an **`assignedClientId`**:

- It appears in the client's app as a program they **follow and log against**, but **cannot edit**.
- The trainer keeps editing it; **edits propagate live** to the client.
- The client can still create and use **their own** programs alongside the assigned one.
- This is distinct from admin **recommended templates** (`userId IS NULL`) — those are global suggestions; an assigned program is a private, per-client plan.

**On leaving / switching:** the client keeps a **personal copy** of the program (so they don't lose their plan), and the trainer retains **read-only** access to the data the client logged **during the linked window** (no new data after).

## Trainer experience

1. **Roster home** — all clients with at-a-glance **adherence signals**: workouts this week, last active, on-track vs. fell-off.
2. **Per-client view** — drill into a client's progress, session log, and calendar, **read-only** (reuses the existing user views).
3. **Feedback / notes** — leave notes or comments on a client's sessions or program that the client sees (a coaching back-and-forth).
4. **Activity notifications** — alerts when a client completes or misses workouts. **In-app first**; email when an email provider is chosen (the same dependency that parks the Slice 4 auth email flows).

## Admin additions

Folded into the existing `(admin)` console: the trainer-application **approval queue**, viewing/managing trainer↔client links and rosters, and **revoking** trainer status.

## Authorization

Mirrors the existing `requireUserId()` discipline ([Auth](auth.md)):

- **`requireTrainer()`** gates trainer-only data/actions.
- **`canAccessClient(trainerId, clientId)`** authorizes reads of a client's data — true for the active link, and for historical links scoped to the window the client was with that trainer.
- Client data stays private except to their linked trainer (and admins). A trainer sees only their own clients.

## Data model touchpoints (additive)

- `programs.assignedClientId` — nullable; set on trainer-authored client programs.
- `trainer_clients` — the time-windowed link (one active per client).
- `trainer_applications` — the approval queue.
- Trainer invite code — a column on the trainer (or a `trainer_invites` table if codes rotate).
- `coach_notes` — trainer feedback on a client's sessions/program.
- `notifications` — in-app notifications (and later email).

All additive; no existing user/admin behavior changes.

## Natural build order

Not rigid phases — independently shippable slices, roughly: (1) trainer role + application/approval, (2) invite codes + the trainer↔client link, (3) assigned programs + client-follows visibility, (4) roster + per-client read-only monitoring, (5) feedback/notes, (6) notifications. Email-backed notifications wait on an email provider.
