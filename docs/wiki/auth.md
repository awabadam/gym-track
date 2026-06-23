# Auth & Multi-Tenancy

[← Wiki Home](README.md)

GymTrack uses **Better Auth** with email + password. There are three pieces: the server instance (`lib/auth.ts`), the API route that serves auth endpoints (`app/api/auth/[...all]/route.ts`), the browser client (`lib/auth-client.ts`), plus the optimistic `proxy.ts` redirect layer.

## Server: `lib/auth.ts`

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true },
  plugins: [
    admin({ adminUserIds }),  // roles + user management
    nextCookies(),            // lets server actions set the session cookie (must be last)
  ],
});
```

- **Drizzle adapter** persists to the [auth tables](data-model.md#auth-tables).
- **Email + password** is the only method enabled. The code comments note where to drop in a `socialProviders.google` block later.
- **`admin()`** plugin adds roles and user management (see [Admin roles](#admin-roles)). It contributes the `role`/`banned`/`banReason`/`banExpires` columns on `user` and `impersonatedBy` on `session`.
- **`nextCookies()`** plugin allows the sign-in/sign-up flows to set the session cookie from a server context. It must stay **last** in the array.

### `requireUserId()` — the authorization boundary

```ts
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized: no signed-in user");
  return session.user.id;
}
```

**This is the single source of truth for "who is the user".** Every function in [`data/`](data-layer.md) and every mutation in [`app/actions/`](data-layer.md) calls it and scopes its queries by the returned id. If you add a new read or write that touches user-owned data, it **must** start with `requireUserId()` and filter on `userId`.

### Admin roles

The Better Auth `admin` plugin adds a `role` to users (`"user"` by default, or `"admin"`). `lib/auth.ts` exposes three helpers:

| Helper | Use |
|--------|-----|
| `userIsAdmin(user)` | Pure check on a session user object — `role === "admin"` OR id in `BETTER_AUTH_ADMIN_USER_IDS`. Used by layouts/nav. |
| `requireAdmin()` | Throws unless the caller is an admin; returns their id. Gates every admin **data read and action**. |
| `isCurrentUserAdmin()` | Non-throwing variant for the current request (soft redirects, conditional nav). |

Admin access is enforced in three layers: `proxy.ts` (any signed-in user passes the cookie check) → `app/(admin)/layout.tsx` (`userIsAdmin` else `redirect("/")`) → `requireAdmin()` inside every admin data/action call. The admin console UI is documented under [Routes](routes.md) and its data/actions under [Data Layer](data-layer.md#admin-data--actions).

**Bootstrapping the first admin:** there is no admin until one is designated. Either set `BETTER_AUTH_ADMIN_USER_IDS` (comma-separated user ids — always treated as admin regardless of the DB) or set a user's `role` to `"admin"` directly in the DB. New users always default to `"user"`.

## API route: `app/api/auth/[...all]/route.ts`

A single catch-all that wraps the auth instance with `toNextJsHandler(auth)` and exports `GET` and `POST`. This serves every Better Auth endpoint (sign-in, sign-up, sign-out, session, …). It's the **only** route under `app/api`.

## Client: `lib/auth-client.ts`

```ts
export const authClient = createAuthClient({ plugins: [adminClient()] });
export const { signIn, signUp, signOut, useSession } = authClient;
```

`baseURL` is intentionally omitted — client and server share an origin, so Better Auth derives it from `window.location`. The `adminClient()` plugin mirrors the server admin plugin for any client-side calls. Used by [`components/auth/auth-form.tsx`](components.md) (sign-in/up) and [`sign-out-button.tsx`](components.md).

## The proxy (Next 16 "middleware"): `proxy.ts`

> In Next.js 16 the middleware file/export is named **`proxy`**, not `middleware`. This is one of the framework's breaking changes from older versions.

The proxy does **optimistic cookie-presence redirects only** — it never validates the session (that would mean a DB hit on every request). Real validation always happens later in the data layer via `requireUserId()`.

Logic:

- Public paths: `/sign-in`, `/sign-up`, and `/` (the root branches between landing page and dashboard itself).
- **No session cookie + protected route** → redirect to `/sign-in`.
- **Has session cookie + auth page** → redirect to `/` (the dashboard).

`getSessionCookie(request)` from `better-auth/cookies` does the cheap cookie check. The `matcher` runs the proxy on everything except Next internals, the `api/auth` route, and static asset extensions.

## How auth shapes rendering

The session drives which **shell** wraps a page (the root layout is now minimal — see [Routes](routes.md#route-groups)):

- **`app/(app)/layout.tsx`** calls `auth.api.getSession()`: **no session** → renders `children` full-bleed (the landing page and auth screens own their layout); **session** → wraps `children` in the app shell (`AppSidebar`, `AppHeader`, `BottomNav`). It also passes `isAdmin` so the sidebar can show the Admin link.
- **`app/(admin)/layout.tsx`** gates on `userIsAdmin` (else `redirect("/")`) and renders the distinct admin shell (`AdminSidebar` + admin header).

The root route `app/(app)/page.tsx` branches the same way: signed-out visitors get the [`KineticLanding`](components.md) marketing page; signed-in users get the dashboard. Admins reach the console via the sidebar/header "Admin" link and return via "Exit to app".

## Multi-tenancy model

| Resource | Scope | Mechanism |
|----------|-------|-----------|
| Exercises (recommended) | **Shared**, read-only to users, **admin-managed** | `userId IS NULL`; visible to all, mutable only via the admin console |
| Exercises (custom) | **Private** per user | `exercises.userId`; reads scoped `userId IS NULL OR userId = me`, writes guarded by `assertExerciseOwned` |
| Programs (recommended templates) | **Shared**, read-only to users, **admin-managed** | `programs.userId IS NULL`; a partial unique index keeps template slugs globally unique |
| Programs (user) / days / exercises | **Private** per user | `programs.userId` + cascade |
| Sessions / sets | **Private** per user | `sessions.userId` + cascade |

(The exercise/program ownership models, the action validation layer, and the admin console were added in the production-hardening pass — see the [plan](../production-readiness-plan.md).)

Every owner-scoped query filters on `userId` from `requireUserId()`. Mutations additionally re-check ownership with helpers like `assertProgramOwned` / `assertSessionOwned` before writing (see [Data Layer](data-layer.md#ownership-checks)). The shared (`userId IS NULL`) rows are mutable only through the admin console, gated by `requireAdmin()`; the program-builder actions use `assertProgramManageable()` so the owner edits their own program and an admin edits a template with the same components.

### First sign-in seeding

New users have no programs. On the first dashboard load, `app/page.tsx` calls `ensureUserSeeded(userId)` ([`lib/onboarding.ts`](data-layer.md)), which gives the user a **personal copy** of the default *Maximal Growth — Upper/Lower 4 Days* program (`db/seed-program.ts`) wired to the shared catalog. It's safe to call on every load — it no-ops once a program exists, and the `(userId, slug)` unique index guards against a double-seed from concurrent first requests.

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon/Postgres connection string (auth tables live here too) |
| `BETTER_AUTH_SECRET` | signing secret — generate a long random string |
| `BETTER_AUTH_URL` | the public origin the app is served on (e.g. `https://gym-track.example.com`) |
| `BETTER_AUTH_ADMIN_USER_IDS` | optional, comma-separated user ids always treated as admin (a way to bootstrap/guarantee the owner's access) |

See [Deployment](deployment.md) and `.env.example`.
