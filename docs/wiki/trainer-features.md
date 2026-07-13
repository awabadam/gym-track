# Trainer Features

GymTrack is a 3-role platform (user / trainer / admin). **Trainers** are lifters who
have been promoted to coach other users: they get an invite code, a dedicated "Coach
Console" workspace, and tools to assign/edit programs, monitor client workouts, and
leave coaching notes. This page documents how the trainer role is granted and
everything a trainer can do once they have it.

The trainer role is tracked on the Better Auth `user.role` field. All trainer
routes and server actions gate on it via `requireTrainer()`
(`lib/auth.ts:89`), which throws unless the current session's `user.role === "trainer"`.
See [Auth & roles](./auth-and-roles.md) for the role model.

---

## Becoming a trainer

A plain user requests trainer access through an application that an admin must
approve.

1. **Apply** — `/become-a-trainer` (`app/(app)/become-a-trainer/page.tsx`) renders a
   state-aware page driven by `getMyTrainerApplication()` (`data/trainer.ts:29`),
   which returns the current role plus the newest application row. It shows one of:
   already-a-trainer, pending-review, or an application form (with a "re-apply" hint
   if the last one was declined) — `app/(app)/become-a-trainer/page.tsx:11-13`.
2. **Submit** — `TrainerApplicationForm` (`components/shared/trainer-application-form.tsx`)
   posts an optional note to the `applyToBeTrainer` server action
   (`app/actions/trainer.ts:30`). It rejects if the user is already a trainer/admin
   (`app/actions/trainer.ts:35`) or already has a pending application
   (`app/actions/trainer.ts:49`). The note is validated by `trainerApplicationSchema`
   (max 500 chars, `lib/validation.ts:165`). A row is inserted into
   `trainerApplications` with `status: "pending"` (`app/actions/trainer.ts:56`); a
   partial unique index on pending applications per user is the race backstop
   (`db/schema.ts:113`, caught as PG error `23505` at `app/actions/trainer.ts:64`).
3. **Admin review** — approval/decline happens in the admin area, not here. The
   `TrainerApplicationActions` component (`components/shared/trainer-application-actions.tsx`)
   calls `approveTrainerApplication` / `declineTrainerApplication` from
   `app/actions/admin.ts` (**not** `actions/trainer.ts`). Approval promotes the
   applicant to the `trainer` role via Better Auth `setRole`, but only if they aren't
   already trainer/admin (`app/actions/admin.ts:355`), provisions their `trainers` row
   (invite code) via `provisionTrainer`, and closes the application
   (`app/actions/admin.ts:365-370`). Decline just marks the row `declined`
   (`app/actions/admin.ts:381`). See [Admin features](./admin-features.md) for the
   review queue.

---

## Trainer ↔ client relationship

The link is established by **invite codes** and stored in `trainerClients`
(`db/schema.ts:127`). A client has **at most one active trainer** at a time, enforced
by a partial unique index on `clientId WHERE status='active'` (`db/schema.ts:144`).
Ended links are kept as history rather than deleted.

### Invite codes

- Each trainer has one row in `trainers` (`db/schema.ts:119`) holding a unique
  `inviteCode`. Codes are 8 uppercase chars from an unambiguous alphabet (no I/O/0/1),
  generated with crypto-strong randomness in `generateInviteCode()`
  (`lib/invite.ts:13`). Uniqueness is not guaranteed by the generator — callers
  retry on the unique-index collision.
- `getMyTrainerInvite()` (`data/trainer.ts:96`) returns the trainer's code, lazily
  creating the `trainers` row on first read via `ensureTrainerRow`
  (`data/trainer.ts:55`) — a backfill for trainers provisioned before the table
  existed, with generate-and-retry on the `inviteCode` unique collision.
- `InviteCodeShare` (`components/shared/invite-code-share.tsx`) displays the code and a
  shareable `/join/<CODE>` link with copy-to-clipboard. The absolute URL is resolved
  from `window.location.origin` at copy time (`invite-code-share.tsx:9`).

### Joining a trainer

- **Invite landing** — `/join/[code]` (`app/(app)/join/[code]/page.tsx`) looks the
  trainer up by code via `getTrainerByCode()` (`data/trainer.ts:417`, no auth — case
  -insensitive, trimmed, uppercased). Signed-in visitors get the one-click
  `JoinTrainerCta` (`components/shared/join-trainer-cta.tsx`); signed-out visitors are
  sent to `/sign-up` first (`app/(app)/join/[code]/page.tsx:61-67`).
- **Manual code entry** — the client-facing `/coach` page also has a `JoinTrainerForm`
  (`components/shared/join-trainer-form.tsx`) for typing a code directly.
- **The action** — `joinTrainer(code)` (`app/actions/trainer.ts:79`) normalizes the
  code, looks up the trainer, rejects self-coaching (`:96`) and re-joining the same
  coach (`:115`). Switching coaches: it first **transfers the old coach's assigned
  program to the client** (`transferAssignedPrograms`, see below), ends the current
  active link (`status: "ended"`), then opens a new active link
  (`app/actions/trainer.ts:125-144`). The Neon HTTP driver has no transactions, so
  these are sequential statements guarded by the partial unique index. Fires a
  `client_joined` notification to the trainer (`:154`).

### Leaving a trainer

- `/coach` (`app/(app)/coach/page.tsx`) — the "my coach" view — shows the active coach
  (from `getMyCoach()`, `data/trainer.ts:140`) with a `LeaveTrainerButton`
  (`components/shared/leave-trainer-button.tsx`), or the join form if none.
- `leaveTrainer()` (`app/actions/trainer.ts:391`) transfers the coach's assigned
  program to the client (so they keep their plan), then marks the active link `ended`
  and fires a `client_left` notification (`:419`).

### Program transfer on unlink

`transferAssignedPrograms(trainerId, clientId)` (`app/actions/trainer.ts:189`) runs on
both leave and coach-switch. Any program the trainer authored **for** that client
(`programs.userId = trainer`, `programs.assignedClientId = client`) is re-homed to the
client: `userId` is set to the client, `assignedClientId` cleared, and the slug made
unique within the client's namespace (`:200-222`). Without this, an ex-client would
keep following a program the trainer could still edit live.

---

## Trainer workspace

The **Coach Console** lives under the `(trainer)` route group. Its layout
(`app/(trainer)/layout.tsx`) gates the entire console — it redirects to `/` unless
`session.user.role === "trainer"` (`app/(trainer)/layout.tsx:18-19`; admins are not
trainers). It renders `TrainerSidebar` (`components/shared/trainer-sidebar.tsx`), whose
only nav item is **Clients** (`trainer-sidebar.tsx:8`), plus an "Exit to app" link.

### Client list — `/clients`

`app/(trainer)/clients/page.tsx` fetches the invite code and active clients in parallel
(`getMyTrainerInvite`, `getMyActiveClients`). It shows the `InviteCodeShare` card and a
responsive list/table of active clients (name, email, joined date), each linking to the
client detail page. `getMyActiveClients()` (`data/trainer.ts:110`) joins
`trainerClients` (status `active`) to the `user` table, newest link first.

### Client detail — `/clients/[clientId]`

`app/(trainer)/clients/[clientId]/page.tsx` is the hub for one client. It loads
`getClientDetail` (`data/trainer.ts:175`) — which returns null (→ `notFound()`) unless
the client is an **active** client of this trainer — plus recent sessions and coaching
notes. The page shows:

- **Assigned program** card (edit/delete) or an **Assign a program** form if none.
- A **Trained volume** muscle map — `getClientDetail` also pulls the client's logged
  volume by muscle over 30 days (`getActualVolumeByMuscle`, `data/trainer.ts:206-209`),
  authorized because the active link is verified.
- **Coaching notes** — a `CoachNoteForm` (general note) and `CoachNotesList`.
- **Recent workouts** — from `getClientRecentSessions` (`data/trainer.ts:244`), each
  row linking to the session detail. Guarded by `assertActiveClient`.

### Editing a client's program — `/clients/[clientId]/program/edit`

`app/(trainer)/clients/[clientId]/program/edit/page.tsx` reuses the shared
`ProgramWeekBuilder` (day/exercise editor) to edit the assigned program in place, wiring
its details form to the standard `updateProgram` action (`app/actions/programs.ts`).
It also has a "Danger zone" that deletes the assigned program via
`deleteAssignedProgram`. `notFound()` if there's no active client or no assigned program
(`program/edit/page.tsx:35`). See [Programs & exercises](./programs-and-exercises.md)
for the builder.

### Viewing a client session — `/clients/[clientId]/sessions/[sessionId]`

`app/(trainer)/clients/[clientId]/sessions/[sessionId]/page.tsx` is a **read-only**
view of one logged workout, from `getClientSessionDetail` (`data/trainer.ts:278`,
guarded, returns null → `notFound()`). It shows the day's plan, every logged set
(weight × reps, RIR), a "Muscles worked" map, and a **session-scoped** coach-note form
(`CoachNoteForm` bound to this session) plus that session's notes from
`getClientSessionNotes` (`data/trainer.ts:365`).

---

## Coaching tools

### Coach notes

Two kinds, both in the `coachNotes` table (`db/schema.ts:182`): **general** notes about a
client (`sessionId` null) and **session-scoped** notes tied to a specific logged workout.

- Added via `addCoachNote(clientId, sessionId, formData)` (`app/actions/trainer.ts:333`),
  guarded by `assertActiveClient`; a session-scoped note must reference a session that
  actually belongs to the client (`:344`). Body is validated by `coachNoteSchema`
  (1–2000 chars, `lib/validation.ts:171`). Fires a `coach_note` notification to the
  client, deep-linking to `/log/<session>` or `/coach` (`:359`).
- Deleted via `deleteCoachNote(noteId)` (`app/actions/trainer.ts:372`) — only the
  authoring trainer can remove a note.
- UI: `CoachNoteForm` (`components/shared/coach-note-form.tsx`, textarea + submit, action
  bound with `clientId`/`sessionId` by the page) and `CoachNotesList`
  (`components/shared/coach-notes-list.tsx`, renders notes with optional delete button
  and session-context link).
- **Client side:** the `/coach` page shows "Notes from your coach" via
  `getMyCoachNotes()` (`data/trainer.ts:392`), which joins the trainer name and links
  each session-scoped note to `/log/<session>`.

### Assigning programs

A trainer authors a program **for** a client that the trainer owns but is assigned to the
client (`programs.userId = trainer`, `programs.assignedClientId = client`,
`db/schema.ts:34`). One assigned program per client.

- `AssignProgramForm` (`components/shared/assign-program-form.tsx`) → `assignProgram`
  (`app/actions/trainer.ts:230`). It rejects a second assignment (`:244`), computes a
  slug unique within both the trainer's programs *and* the client's own slugs so the
  program is reachable at `/programs/[slug]` for the client (`:257-276`), inserts the
  program (`isActive: false`), fires a `program_assigned` notification, and redirects
  into the builder (`:297`).
- `deleteAssignedProgram(programId)` (`app/actions/trainer.ts:304`) deletes only the
  trainer's own assigned programs (cascading days/exercises); the client's own programs
  and logs are preserved.

### Recommended programs & exercises (admin-owned, not trainer)

The `create-recommended-program-dialog.tsx`, `recommended-exercise-dialog.tsx`, and
`recommended-exercise-actions.tsx` components manage the **shared, platform-wide**
recommended catalog. **These are admin tools, not trainer tools** — they import from
`@/app/actions/admin` (`createRecommendedProgram`, `createRecommendedExercise`,
`updateRecommendedExercise`, `deleteRecommendedExercise`), and their dialogs state the
content is shared with every user and only admins can edit it
(`recommended-exercise-dialog.tsx:60`). See [Admin features](./admin-features.md) and
[Programs & exercises](./programs-and-exercises.md).

---

## Server actions & data functions

### `data/trainer.ts` (read side)

| Function | Line | Purpose |
| --- | --- | --- |
| `getMyTrainerApplication()` | `data/trainer.ts:29` | Current role + latest application (drives `/become-a-trainer`) |
| `getMyTrainerInvite()` | `data/trainer.ts:96` | Trainer's invite code (lazily provisions the `trainers` row) |
| `getMyActiveClients()` | `data/trainer.ts:110` | Trainer's active clients (name/email/started) |
| `getMyCoach()` | `data/trainer.ts:140` | Current user's active coach, or null |
| `getClientDetail()` | `data/trainer.ts:175` | One active client: identity + assigned program + 30-day volume |
| `getClientRecentSessions()` | `data/trainer.ts:244` | Active client's recent workouts + set counts |
| `getClientSessionDetail()` | `data/trainer.ts:278` | Read-only detail of one client session (plan + logged sets) |
| `getClientNotes()` | `data/trainer.ts:339` | All notes this trainer wrote about a client |
| `getClientSessionNotes()` | `data/trainer.ts:365` | Notes on one specific client session |
| `getMyCoachNotes()` | `data/trainer.ts:392` | Notes addressed to the current user (client side) |
| `getTrainerByCode()` | `data/trainer.ts:417` | Look a trainer up by invite code (no auth; powers `/join`) |

Read helpers `getClientDetail`, `getClientRecentSessions`, `getClientSessionDetail`,
`getClientNotes`, `getClientSessionNotes` all call `requireTrainer()` and enforce the
active link (via the query or `assertActiveClient`, `data/trainer.ts:215`).

### `app/actions/trainer.ts` (write side)

| Action | Line | Purpose |
| --- | --- | --- |
| `applyToBeTrainer()` | `app/actions/trainer.ts:30` | Submit a trainer application |
| `joinTrainer(code)` | `app/actions/trainer.ts:79` | Join/switch to a trainer by invite code |
| `assignProgram(clientId, …)` | `app/actions/trainer.ts:230` | Author an assigned program for a client |
| `deleteAssignedProgram(id)` | `app/actions/trainer.ts:304` | Delete the trainer's assigned program |
| `addCoachNote(clientId, sessionId, …)` | `app/actions/trainer.ts:333` | Add a general or session-scoped note |
| `deleteCoachNote(id)` | `app/actions/trainer.ts:372` | Delete a note (author only) |
| `leaveTrainer()` | `app/actions/trainer.ts:391` | Client ends their active coach link |

Approval/decline of applications lives in `app/actions/admin.ts`
(`approveTrainerApplication:340`, `declineTrainerApplication:376`), not here.

---

## Key files

| File | Role |
| --- | --- |
| `app/(trainer)/layout.tsx` | Coach Console shell; gates the whole group to `role === "trainer"` |
| `app/(trainer)/clients/page.tsx` | Client list + invite-code sharing |
| `app/(trainer)/clients/[clientId]/page.tsx` | Client hub: program, volume map, notes, recent workouts |
| `app/(trainer)/clients/[clientId]/program/edit/page.tsx` | Edit assigned program (ProgramWeekBuilder + delete) |
| `app/(trainer)/clients/[clientId]/sessions/[sessionId]/page.tsx` | Read-only client session view + session notes |
| `app/(app)/coach/page.tsx` | Client-facing "my coach" view (join/leave, coach notes) |
| `app/(app)/become-a-trainer/page.tsx` | Trainer application page (state-aware) |
| `app/(app)/join/[code]/page.tsx` | Invite landing for a shared code |
| `data/trainer.ts` | Read functions (clients, sessions, notes, invite lookup) |
| `app/actions/trainer.ts` | Write actions (apply, join/leave, assign, notes) |
| `lib/invite.ts` | Invite-code generator |
| `lib/auth.ts` | `requireTrainer()` gate (`:89`) |
| `db/schema.ts` | `trainerApplications` (`:95`), `trainers` (`:119`), `trainerClients` (`:127`), `coachNotes` (`:182`), `programs.assignedClientId` (`:34`) |
| `lib/validation.ts` | `trainerApplicationSchema` (`:165`), `coachNoteSchema` (`:171`) |
| `components/shared/trainer-sidebar.tsx` | Coach Console sidebar |
| `components/shared/coach-note-form.tsx` / `coach-notes-list.tsx` | Note authoring + rendering |
| `components/shared/assign-program-form.tsx` | Assign-program form |
| `components/shared/invite-code-share.tsx` | Invite code / link with copy |
| `components/shared/join-trainer-cta.tsx` / `join-trainer-form.tsx` | Join a trainer (button / code entry) |
| `components/shared/leave-trainer-button.tsx` | Leave current coach (confirm dialog) |
| `components/shared/trainer-application-form.tsx` | Apply-to-be-trainer form |
| `components/shared/trainer-application-actions.tsx` | Admin approve/decline (calls `actions/admin`) |
| `components/shared/create-recommended-program-dialog.tsx`, `recommended-exercise-dialog.tsx`, `recommended-exercise-actions.tsx` | **Admin** recommended-catalog tools (call `actions/admin`) |

---

## See also

- [Auth & roles](./auth-and-roles.md) — the user/trainer/admin role model and gates
- [Admin features](./admin-features.md) — trainer-application review, recommended catalog
- [Programs & exercises](./programs-and-exercises.md) — the program builder shared by trainer program editing
