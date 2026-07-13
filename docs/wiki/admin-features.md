# Admin Features

The admin console is a separate route group (`app/(admin)/`) that lets platform administrators manage the whole system: user accounts and roles, the shared exercise catalog, recommended program templates, and the trainer-application queue. It is built on Better Auth's admin plugin for user operations, and on direct Drizzle queries for the shared catalog (rows where `userId IS NULL`).

The console lives under `/admin` with four sections:

| Section | Route | Page |
| --- | --- | --- |
| Users | `/admin` | `app/(admin)/admin/page.tsx` |
| Trainers | `/admin/trainers` | `app/(admin)/admin/trainers/page.tsx` |
| Exercises | `/admin/exercises` | `app/(admin)/admin/exercises/page.tsx` |
| Programs | `/admin/programs` | `app/(admin)/admin/programs/page.tsx` |

Navigation is provided by `AdminSidebar` (desktop, `components/shared/admin-sidebar.tsx:7`) and `AdminNav` (mobile, `components/shared/admin-nav.tsx:6`).

## Access control

Admin access is gated in two layers.

**1. Layout-level gate (whole console).** `app/(admin)/layout.tsx:18` fetches the session and calls `userIsAdmin`; if the visitor isn't signed in or isn't an admin, it `redirect("/")` (`app/(admin)/layout.tsx:19`). This makes every page under `(admin)` admin-only regardless of individual page logic.

**2. Data/action-level gate (defense in depth).** Every admin data function and server action independently calls `requireAdmin()` (`lib/auth.ts:72`), which throws `"Forbidden: admin access required"` unless the current session user passes `userIsAdmin`. This means even if a mutation were reached outside the layout, it still fails without admin rights.

Who counts as an admin is defined by `userIsAdmin` (`lib/auth.ts:61`):

```ts
return user.role === "admin" || adminUserIds.includes(user.id);
```

So admin status is either the Better Auth `admin` role or membership in `BETTER_AUTH_ADMIN_USER_IDS`. The admin plugin is registered in `lib/auth.ts:35` with roles `user`, `admin`, `trainer`. A non-throwing variant, `isCurrentUserAdmin()` (`lib/auth.ts:102`), exists for nav/soft-redirect checks.

See [Auth & roles](./auth-and-roles.md) for the full role model.

## User management

The Users page (`app/(admin)/admin/page.tsx`) renders a searchable, paginated user table (page size 20). Data comes from `listUsersForAdmin` (`data/admin.ts:32`), which calls `requireAdmin()` then reads through `auth.api.listUsers` (the admin plugin, so its own authorization is also enforced). Search filters by email (`data/admin.ts:46`). Each row shows name, email, a role badge, banned status, join date, and a `UserRowActions` menu (`app/(admin)/admin/page.tsx:172`).

Row actions live in `components/shared/user-row-actions.tsx`. Each UI action maps to a server action in `app/actions/admin.ts`:

| UI action | Component ref | Server action | Location |
| --- | --- | --- | --- |
| Promote to admin / Demote to user | `user-row-actions.tsx:124` | `setUserRole(id, role)` | `app/actions/admin.ts:63` |
| Impersonate | `user-row-actions.tsx:132` | `impersonateUser(id)` | `app/actions/admin.ts:130` |
| Set password (dialog) | `user-row-actions.tsx:88` | `setUserPassword(id, formData)` | `app/actions/admin.ts:105` |
| Ban (dialog: reason + expiry days) | `user-row-actions.tsx:78` | `banUser(id, formData)` | `app/actions/admin.ts:76` |
| Unban | `user-row-actions.tsx:149` | `unbanUser(id)` | `app/actions/admin.ts:93` |
| Remove (destructive confirm) | `user-row-actions.tsx:98` | `removeUser(id)` | `app/actions/admin.ts:118` |
| Create user (dialog in page header) | `create-user-dialog.tsx:31` | `createUser(formData)` | `app/actions/admin.ts:46` |

Notes on the actions:

- **Self-protection.** `setUserRole`, `banUser`, `removeUser`, and `impersonateUser` all call `requireOtherUser(targetId)` (`app/actions/admin.ts:39`), which throws `"You can't perform this action on your own account"` if the admin targets themselves. The UI reinforces this by disabling those menu items when `isSelf` (`user-row-actions.tsx:123`, `131`, `148`, `167`). `unbanUser` and `setUserPassword` only require `requireAdmin()` and may target the current user.
- **User operations delegate to Better Auth.** `createUser` → `auth.api.createUser`, `setUserRole` → `auth.api.setRole`, `banUser` → `auth.api.banUser` (converting `expiresInDays` to seconds, `× 86400`; empty = permanent, `app/actions/admin.ts:86`), `unbanUser` → `auth.api.unbanUser`, `setUserPassword` → `auth.api.setUserPassword`, `removeUser` → `auth.api.removeUser`.
- **Validation.** Form inputs are parsed with Zod schemas from `lib/validation.ts`: `createUserSchema` (`:154`), `setRoleSchema` (`:161`), `setPasswordSchema` (`:179`), `banUserSchema` (`:211`).
- **Impersonation.** `impersonateUser` (`app/actions/admin.ts:130`) starts a session as the target and redirects to `/`. A matching `stopImpersonating` (`app/actions/admin.ts:143`) ends it and redirects back to `/admin`. (Note: `impersonateUser` and `stopImpersonating` are wired to the row menu / used elsewhere but are not required by the requested "map each action" set beyond impersonate.)
- After mutating, each action calls `revalidatePath("/admin")` so the table refreshes.

Errors thrown by these actions are surfaced client-side: `user-row-actions.tsx` shows dialog-based errors (`run()` helper at `:67`, error dialog at `:272`).

## Catalog management

Admins own the shared "recommended" catalog — rows where `userId IS NULL`, which every user sees but cannot mutate.

### Recommended exercises

The Exercises page (`app/(admin)/admin/exercises/page.tsx`) lists shared exercises via `listRecommendedExercises` (`data/admin.ts:108`, filtered by `isNull(exercises.userId)`), paginated at 20 with name search. Create/edit/delete are handled by dialogs/menus (`RecommendedExerciseDialog`, `RecommendedExerciseActions`) bound to these actions:

- `createRecommendedExercise(formData)` — `app/actions/admin.ts:160`. Inserts with `userId: null`; derives coarse `muscleGroup` from `primaryMuscle` via `fineToCoarse` (`app/actions/admin.ts:163`).
- `updateRecommendedExercise(id, formData)` — `app/actions/admin.ts:172`. Guarded by `assertRecommended` (`:151`) so only shared exercises can be edited.
- `deleteRecommendedExercise(id)` — `app/actions/admin.ts:189`. Refuses deletion if the exercise is used in any program or has any logged sets (`app/actions/admin.ts:199`, `:209`), to avoid orphaning history across users.

### Recommended programs (templates)

The Programs page (`app/(admin)/admin/programs/page.tsx`) lists templates via `listRecommendedPrograms` (`data/admin.ts:147`, `isNull(programs.userId)`), attaching a per-program day count (`data/admin.ts:173`). Each row links to `/admin/programs/[id]/edit`.

The edit page (`app/(admin)/admin/programs/[id]/edit/page.tsx`) loads the template with its days and exercises via `getRecommendedProgramById` (`data/admin.ts:190`) plus the exercise picker list via `getAllRecommendedExercises` (`data/admin.ts:137`). It reuses the shared `ProgramWeekBuilder` component, binding `updateRecommendedProgram` for detail edits (`app/(admin)/admin/programs/[id]/edit/page.tsx:53`), and offers a "Danger zone" delete bound to `deleteRecommendedProgram` (`:79`).

Program actions:

- `createRecommendedProgram(formData)` — `app/actions/admin.ts:253`. Inserts `userId: null`, `isActive: false`, generates a unique template slug via `uniqueTemplateSlug` (`:226`), then redirects to the edit page.
- `updateRecommendedProgram(id, formData)` — `app/actions/admin.ts:267`. Guarded by `assertTemplate` (`:244`); re-derives the slug.
- `deleteRecommendedProgram(id)` — `app/actions/admin.ts:283`. Days/exercises cascade via FK; templates aren't referenced by user sessions (users clone them), so no history is orphaned. Redirects to `/admin/programs`.

See [Programs & exercises](./programs-and-exercises.md) for how these templates are consumed by regular users.

## Trainer approvals

The Trainers page (`app/(admin)/admin/trainers/page.tsx`) shows the pending trainer-application queue via `listTrainerApplications({ status: "pending" })` (`data/admin.ts:67`), which left-joins each application to the applicant's name/email. Each row renders `TrainerApplicationActions` (`components/shared/trainer-application-actions.tsx`) with Approve / Decline buttons that call:

- `approveTrainerApplication(id)` — `app/actions/admin.ts:340`. Loads the pending application (`getPendingApplication`, `:325`), re-checks the applicant's **current** role so a stale application never demotes someone who has since become a trainer/admin — only plain users are promoted to `trainer` via `auth.api.setRole` (`app/actions/admin.ts:355`). It then provisions a `trainers` row with a unique invite code (`provisionTrainer`, `:305`, idempotent via `onConflictDoNothing` on `userId`, with generate-and-retry on invite-code collisions), and marks the application `approved` with `reviewedBy`/`reviewedAt`. Revalidates `/admin/trainers` and `/admin`.
- `declineTrainerApplication(id)` — `app/actions/admin.ts:376`. Marks the application `declined` with reviewer metadata; revalidates `/admin/trainers`.

Both approve/decline actions run under `requireAdmin()` and use the Zod `idSchema` to validate the application id. Approval is the sole admin touchpoint in the trainer flow — the actual trainer-side features live in `app/actions/trainer.ts`. Applications are submitted by users elsewhere; the admin only reviews them here.

See [Trainer features](./trainer-features.md) for the trainer side of this flow.

## Server actions & data functions

### `data/admin.ts` (read side — all call `requireAdmin()`)

| Function | Location | Purpose |
| --- | --- | --- |
| `listUsersForAdmin` | `data/admin.ts:32` | Paginated user list via `auth.api.listUsers`; returns `currentUserId` for self checks |
| `listTrainerApplications` | `data/admin.ts:67` | Application queue (default `pending`) joined to applicant name/email |
| `listRecommendedExercises` | `data/admin.ts:108` | Paginated shared exercises (`userId IS NULL`) |
| `getAllRecommendedExercises` | `data/admin.ts:137` | All shared exercises (no pagination) for the builder picker |
| `listRecommendedPrograms` | `data/admin.ts:147` | Paginated templates with day counts |
| `getRecommendedProgramById` | `data/admin.ts:190` | Single template with days + exercises for the builder |

`AdminUser` type is defined at `data/admin.ts:14`.

### `app/actions/admin.ts` (write side — all call `requireAdmin()` / `requireOtherUser()`)

| Action | Location | Delegates to |
| --- | --- | --- |
| `createUser` | `:46` | `auth.api.createUser` |
| `setUserRole` | `:63` | `auth.api.setRole` |
| `banUser` | `:76` | `auth.api.banUser` |
| `unbanUser` | `:93` | `auth.api.unbanUser` |
| `setUserPassword` | `:105` | `auth.api.setUserPassword` |
| `removeUser` | `:118` | `auth.api.removeUser` |
| `impersonateUser` | `:130` | `auth.api.impersonateUser` → redirect `/` |
| `stopImpersonating` | `:143` | `auth.api.stopImpersonating` → redirect `/admin` |
| `createRecommendedExercise` | `:160` | Drizzle insert (`userId: null`) |
| `updateRecommendedExercise` | `:172` | Drizzle update (guarded by `assertRecommended`) |
| `deleteRecommendedExercise` | `:189` | Drizzle delete (usage-checked) |
| `createRecommendedProgram` | `:253` | Drizzle insert + redirect to edit |
| `updateRecommendedProgram` | `:267` | Drizzle update (guarded by `assertTemplate`) |
| `deleteRecommendedProgram` | `:283` | Drizzle delete + redirect |
| `approveTrainerApplication` | `:340` | `auth.api.setRole` + provision trainer row |
| `declineTrainerApplication` | `:376` | Drizzle update (status `declined`) |

Internal helpers: `userId` (`:34`), `requireOtherUser` (`:39`), `assertRecommended` (`:151`), `uniqueTemplateSlug` (`:226`), `assertTemplate` (`:244`), `provisionTrainer` (`:305`), `getPendingApplication` (`:325`).

## Key files

| File | Role |
| --- | --- |
| `app/(admin)/layout.tsx` | Admin console shell + layout-level admin gate |
| `app/(admin)/admin/page.tsx` | Users table (list, search, paginate) |
| `app/(admin)/admin/trainers/page.tsx` | Trainer application queue |
| `app/(admin)/admin/exercises/page.tsx` | Recommended exercises catalog |
| `app/(admin)/admin/programs/page.tsx` | Recommended program templates list |
| `app/(admin)/admin/programs/[id]/edit/page.tsx` | Template builder + delete |
| `data/admin.ts` | Admin read functions (all `requireAdmin`-gated) |
| `app/actions/admin.ts` | Admin server actions (users, catalog, approvals) |
| `lib/auth.ts` | `requireAdmin`, `userIsAdmin`, `isCurrentUserAdmin`, admin plugin config |
| `components/shared/admin-sidebar.tsx` | Desktop admin nav |
| `components/shared/admin-nav.tsx` | Mobile admin section nav |
| `components/shared/user-row-actions.tsx` | Per-user action menu + dialogs |
| `components/shared/create-user-dialog.tsx` | Create-user form dialog |
| `components/shared/trainer-application-actions.tsx` | Approve/decline buttons |
| `lib/validation.ts` | Zod schemas for admin forms |

## See also

- [Auth & roles](./auth-and-roles.md)
- [Trainer features](./trainer-features.md)
- [Programs & exercises](./programs-and-exercises.md)
