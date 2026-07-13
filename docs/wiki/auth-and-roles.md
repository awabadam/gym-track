# Authentication, Roles & Multi-tenancy

This app uses [Better Auth](https://www.better-auth.com/) for authentication, backed by the same PostgreSQL database (via Drizzle) as the rest of the app. Auth is email + password only (no external social providers wired up). On top of Better Auth's **admin plugin**, the app defines three roles — `user`, `trainer`, `admin` — and gates data/actions with a small set of server-side guard helpers. Every data read and mutation scopes to the signed-in user id, giving per-user multi-tenancy over a shared exercise catalog.

Related pages: [Architecture](./architecture.md) · [Trainer features](./trainer-features.md) · [Admin features](./admin-features.md) · [Data model](./data-model.md)

## Auth setup

The Better Auth server instance is configured in `lib/auth.ts:18-42`:

- **Database adapter**: `drizzleAdapter(db, { provider: "pg", schema: authSchema })` — Better Auth writes to the app's Postgres via Drizzle, using the tables in `db/auth-schema.ts` (`user`, `session`, `account`, plus verification) (`lib/auth.ts:19-22`).
- **Providers**: `emailAndPassword: { enabled: true }` (`lib/auth.ts:26-28`). No social providers are configured — the comment at `lib/auth.ts:23-25` notes a `socialProviders.google` block could be added later. Passwords require a minimum of 8 characters, enforced client-side in the form (`components/auth/auth-form.tsx:93`).
- **Plugins** (`lib/auth.ts:29-41`):
  - `admin({ adminUserIds, roles: { user: userAc, admin: adminAc, trainer: userAc } })` — the admin plugin adds roles + user management. The `roles` map widens the assignable role union to include `trainer`, which is given the same plugin-level access control (`userAc`) as a regular user — i.e. `trainer` is an app-level capability, **not** a Better Auth admin role (`lib/auth.ts:35-38`).
  - `nextCookies()` — must stay last so it can set cookies for the plugins above (`lib/auth.ts:39-40`).

**Route handler**: All Better Auth endpoints are served by the catch-all `app/api/auth/[...all]/route.ts:1-4`, which exports `POST`/`GET` from `toNextJsHandler(auth)`.

**Client**: `lib/auth-client.ts` creates the React client with `createAuthClient({ plugins: [adminClient()] })` and re-exports `signIn`, `signUp`, `signOut`, `useSession` (`lib/auth-client.ts:6-10`). `baseURL` is intentionally omitted — client and server share an origin, so it's derived from `location` (`lib/auth-client.ts:4-5`).

**Session handling**:
- Sessions live in the `session` table (`db/auth-schema.ts`), including an `impersonatedBy` column used by the admin impersonation feature.
- On the server, sessions are read with `auth.api.getSession({ headers: await headers() })` — this is the pattern in every guard helper and in server pages such as `app/(app)/join/[code]/page.tsx:17-20`.
- The `user.role` column is nullable; existing/seed users are treated as the default role until promoted (`db/auth-schema.ts` comment on `role`).

**Sign-in / sign-up UI**: `app/(app)/sign-in/page.tsx` and `app/(app)/sign-up/page.tsx` each render `<AuthForm mode=... />`. The shared form (`components/auth/auth-form.tsx`) calls `signUp.email({ name, email, password })` or `signIn.email({ email, password })` (`components/auth/auth-form.tsx:33-35`), then on success pushes to `/` and calls `router.refresh()` (`components/auth/auth-form.tsx:43-45`). Sign-out is a client button that calls `signOut()` then redirects to `/sign-in` (`components/shared/sign-out-button.tsx:13-18`).

## Roles

Three roles exist: `user` (default), `trainer`, and `admin`.

| Role | Meaning | How assigned |
|------|---------|--------------|
| `user` | Default. New sign-ups get this (the admin plugin defaults new users to `user`). | Automatic on sign-up. |
| `trainer` | Regular user with elevated app-level coaching capabilities. Same Better Auth access as `user`; **not** an admin. | Set via the admin plugin's role management (admin approves a trainer application — see below). |
| `admin` | Platform admin (user management, trainer application review, impersonation). | Either `user.role === "admin"`, or the user id is listed in the `BETTER_AUTH_ADMIN_USER_IDS` env var. |

**Where the role lives**: the nullable `role` column on the `user` table (`db/auth-schema.ts`). A role is read off the session user object (`session.user.role`), e.g. `data/trainer.ts:36-37`.

**adminUserIds env bootstrap** (`lib/auth.ts:10-16`): `BETTER_AUTH_ADMIN_USER_IDS` is a comma-separated list of user ids that are **always** treated as admins, regardless of the stored `role`. It's parsed once at module load (split, trim, drop empties) and passed to both the admin plugin (`adminUserIds` option, `lib/auth.ts:36`) and the pure `userIsAdmin` check (`lib/auth.ts:65`). This guarantees the owner has admin access even before any role has been written to the DB.

### Guard helpers (all in `lib/auth.ts`)

These are the server-side gates that data/actions call. They read the session and throw on failure (except the non-throwing check).

- `requireUserId(): Promise<string>` — `lib/auth.ts:49-55`. Returns the signed-in user's id; throws `"Unauthorized: no signed-in user"` if none. The single source of truth every data/action scopes to.
- `userIsAdmin(user: { id: string; role?: string | null }): boolean` — `lib/auth.ts:61-66`. Pure check: `user.role === "admin"` OR the id is in `adminUserIds`. Takes a session user object; no I/O.
- `requireAdmin(): Promise<string>` — `lib/auth.ts:72-82`. Returns the user id, throwing `"Unauthorized..."` if signed out or `"Forbidden: admin access required"` if not an admin. Used to gate admin-only reads and mutations.
- `requireTrainer(): Promise<string>` — `lib/auth.ts:89-99`. Returns the user id, throwing unless `user.role === "trainer"` **exactly**. Admins are deliberately **not** trainers for this gate (`lib/auth.ts:95`).
- `isCurrentUserAdmin(): Promise<boolean>` — `lib/auth.ts:102-105`. Non-throwing admin check for the current request, used for nav rendering and soft redirects.

## Route protection

`proxy.ts` is the Next.js 16 "Proxy" (formerly Middleware). Its comment is explicit that it does **optimistic cookie-presence redirects only** — real session validation happens in the data layer via `requireUserId()` (`proxy.ts:7-9`).

Logic (`proxy.ts:10-33`):

- **Auth pages** — `/sign-in`, `/sign-up` (`proxy.ts:5`). Reachable without a session.
- **Public routes** — auth pages, plus `/` (marketing landing when signed out, dashboard when signed in — the page branches on session itself), plus `/join` and `/join/*` so signed-out invitees can view a coaching invite (`proxy.ts:16-21`).
- **Signed-out + protected route** → redirect to `/sign-in` (`proxy.ts:24-27`). Presence is detected via `getSessionCookie(request)` from `better-auth/cookies` (`proxy.ts:22`).
- **Signed-in + auth page** → redirect to `/` (`proxy.ts:28-31`).

The `matcher` (`proxy.ts:35-40`) runs on everything except Next internals, `/api/auth`, and static assets.

Note: **the proxy does not enforce roles.** Role gating (admin/trainer) is done in the data/action layer with `requireAdmin` / `requireTrainer`, and pages branch on role for their UI (e.g. `app/(app)/become-a-trainer/page.tsx:8-13`). The proxy only enforces "signed in vs. not."

## Multi-tenancy / data scoping

There is no separate tenant table — multi-tenancy is enforced per row by user id. The convention: **every data function and server action begins by calling `requireUserId()` and filters every query by that id.** The exercise catalog is the one shared, global resource.

Examples from `data/sessions.ts`:

- `getRecentSessions` — `const uid = await requireUserId()` then `.where(eq(sessions.userId, uid))` (`data/sessions.ts:14-26`).
- `getSessionById` — scopes with `and(eq(sessions.id, sessionId), eq(sessions.userId, uid))`, so a user can never read another user's session by id (`data/sessions.ts:33-50`).
- The same `requireUserId()` + `userId = uid` filter recurs in `getInProgressSession`, `getBestSet`, `getSessionsInRange`, etc.

Programs add a second dimension for coach-assigned content (`data/programs.ts`). The `followableByMe(uid)` predicate defines a user's "own surface": their unassigned programs (`userId = uid AND assignedClientId IS NULL`) **OR** programs a coach assigned to them (`assignedClientId = uid`) (`data/programs.ts:13-18`). Programs a trainer authored *for* a client (`userId = trainer, assignedClientId = client`) are deliberately excluded from the client's own list — they surface only in the coach console.

Trainer reads of client data follow the same discipline but gate on the coaching relationship instead: `requireTrainer()` plus `assertActiveClient(trainerId, clientId)`, which throws unless an `active` `trainerClients` link exists (`data/trainer.ts:214-228`, used by `getClientRecentSessions`, `getClientSessionDetail`, `getClientNotes`, etc.). See [Trainer features](./trainer-features.md).

## Invites & becoming a trainer

**Invite codes** (`lib/invite.ts`): `generateInviteCode()` returns an 8-char uppercase code from an unambiguous alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, excluding `I O 0 1`) using `crypto.randomBytes` — 32 symbols = exactly 5 bits each for an unbiased mask (`lib/invite.ts:5-20`). It's pure with no uniqueness guarantee; callers retry on the unique-index collision.

Each trainer has a row in the `trainers` table holding their `inviteCode`. `ensureTrainerRow(trainerId)` lazily mints a code on first read, retrying up to 5 times on a `23505` unique collision and absorbing concurrent inserts via re-select (`data/trainer.ts:55-90`). `getMyTrainerInvite()` wraps it behind `requireTrainer()` (`data/trainer.ts:96-99`).

**Trainer application flow**:

1. A `user` visits `/become-a-trainer`. The page is state-aware off `getMyTrainerApplication()`, which returns `{ role, application }` (`data/trainer.ts:29-46`). It shows: "you're already a trainer" if role is `trainer`/`admin`, "pending review" if a pending application exists, or the application form (with a re-apply variant if previously declined) (`app/(app)/become-a-trainer/page.tsx:8-77`).
2. The submitted application lands in `trainerApplications`. An **admin** reviews it (see [Admin features](./admin-features.md)); approval promotes the user's role to `trainer` via the admin plugin.

**Joining a trainer as a client** (`/join/[code]`):

- The page is public (allowed in `proxy.ts:17-21`). It resolves the code with `getTrainerByCode(code)` — a **no-auth** lookup that normalizes the code (trim + uppercase) and joins `trainers` → `user` for the trainer's name (`data/trainer.ts:417-431`).
- Invalid/expired code → an error card (`app/(app)/join/[code]/page.tsx:22-37`).
- Signed-in invitee → `<JoinTrainerCta>` to accept (joining replaces any existing coach). Signed-out invitee → a "Create an account to join" CTA linking to `/sign-up` (`app/(app)/join/[code]/page.tsx:61-67`).

**New-user onboarding** (`lib/onboarding.ts`): `ensureUserSeeded(userId)` gives a first-time user a personal copy of the default MaxGrowth program so they have something to log against. It's safe to call on every dashboard load — it no-ops once a program exists, and the `(user_id, slug)` unique index guards against a double seed from concurrent first requests (`lib/onboarding.ts:13-27`).

## Key files

| File | Role |
|------|------|
| `lib/auth.ts` | Better Auth server config; role plugin; `adminUserIds` bootstrap; guard helpers (`requireUserId`, `requireAdmin`, `requireTrainer`, `userIsAdmin`, `isCurrentUserAdmin`). |
| `lib/auth-client.ts` | React auth client; exports `signIn`, `signUp`, `signOut`, `useSession`. |
| `app/api/auth/[...all]/route.ts` | Catch-all Better Auth HTTP handler (`toNextJsHandler`). |
| `db/auth-schema.ts` | Drizzle tables Better Auth writes to: `user` (incl. `role`, ban fields), `session` (incl. `impersonatedBy`), `account`, verification. |
| `proxy.ts` | Optimistic cookie-presence route gating (signed-in vs. not); public/auth path rules. |
| `components/auth/auth-form.tsx` | Shared email+password sign-in/sign-up form. |
| `app/(app)/sign-in/page.tsx`, `app/(app)/sign-up/page.tsx` | Auth screens rendering `<AuthForm>`. |
| `components/shared/sign-out-button.tsx` | Client sign-out button. |
| `lib/invite.ts` | Pure crypto-strong invite-code generator. |
| `lib/onboarding.ts` | `ensureUserSeeded` — first-sign-in default program seed. |
| `app/(app)/become-a-trainer/page.tsx` | State-aware trainer application page. |
| `app/(app)/join/[code]/page.tsx` | Public coaching-invite landing. |
| `data/trainer.ts` | Trainer/coach relationship data + invite lookup (`getTrainerByCode`, `ensureTrainerRow`, `assertActiveClient`). |
| `data/sessions.ts`, `data/programs.ts` | Representative per-user data scoping via `requireUserId()`. |
