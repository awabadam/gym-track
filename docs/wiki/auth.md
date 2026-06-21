# Auth & Multi-Tenancy

[← Wiki Home](README.md)

GymTrack uses **Better Auth** with email + password. There are three pieces: the server instance (`lib/auth.ts`), the API route that serves auth endpoints (`app/api/auth/[...all]/route.ts`), the browser client (`lib/auth-client.ts`), plus the optimistic `proxy.ts` redirect layer.

## Server: `lib/auth.ts`

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],   // lets server actions set the session cookie
});
```

- **Drizzle adapter** persists to the [auth tables](data-model.md#auth-tables).
- **Email + password** is the only method enabled. The code comments note where to drop in a `socialProviders.google` block later.
- **`nextCookies()`** plugin allows the sign-in/sign-up flows to set the session cookie from a server context.

### `requireUserId()` — the authorization boundary

```ts
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized: no signed-in user");
  return session.user.id;
}
```

**This is the single source of truth for "who is the user".** Every function in [`data/`](data-layer.md) and every mutation in [`app/actions/`](data-layer.md) calls it and scopes its queries by the returned id. If you add a new read or write that touches user-owned data, it **must** start with `requireUserId()` and filter on `userId`.

## API route: `app/api/auth/[...all]/route.ts`

A single catch-all that wraps the auth instance with `toNextJsHandler(auth)` and exports `GET` and `POST`. This serves every Better Auth endpoint (sign-in, sign-up, sign-out, session, …). It's the **only** route under `app/api`.

## Client: `lib/auth-client.ts`

```ts
export const authClient = createAuthClient();   // baseURL omitted on purpose
export const { signIn, signUp, signOut, useSession } = authClient;
```

`baseURL` is intentionally omitted — client and server share an origin, so Better Auth derives it from `window.location`. Used by [`components/auth/auth-form.tsx`](components.md) (sign-in/up) and [`sign-out-button.tsx`](components.md).

## The proxy (Next 16 "middleware"): `proxy.ts`

> In Next.js 16 the middleware file/export is named **`proxy`**, not `middleware`. This is one of the framework's breaking changes from older versions.

The proxy does **optimistic cookie-presence redirects only** — it never validates the session (that would mean a DB hit on every request). Real validation always happens later in the data layer via `requireUserId()`.

Logic:

- Public paths: `/sign-in`, `/sign-up`, and `/` (the root branches between landing page and dashboard itself).
- **No session cookie + protected route** → redirect to `/sign-in`.
- **Has session cookie + auth page** → redirect to `/` (the dashboard).

`getSessionCookie(request)` from `better-auth/cookies` does the cheap cookie check. The `matcher` runs the proxy on everything except Next internals, the `api/auth` route, and static asset extensions.

## How auth shapes rendering

`app/layout.tsx` calls `auth.api.getSession()` on the server:

- **No session** → renders `children` full-bleed (the landing page and auth screens own their own layout).
- **Session** → wraps `children` in the app shell (`AppSidebar`, `AppHeader`, `BottomNav`).

The root route `app/page.tsx` does the same branch: signed-out visitors get the [`KineticLanding`](components.md) marketing page; signed-in users get the dashboard.

## Multi-tenancy model

| Resource | Scope | Mechanism |
|----------|-------|-----------|
| Exercises (system) | **Shared, read-only** to users | `userId IS NULL`; visible to all, mutable by none |
| Exercises (custom) | **Private** per user | `exercises.userId`; reads scoped `userId IS NULL OR userId = me`, writes guarded by `assertExerciseOwned` |
| Programs / days / exercises | **Private** per user | `programs.userId` + cascade |
| Sessions / sets | **Private** per user | `sessions.userId` + cascade |

(The exercise ownership model and the action validation layer were added in the production-hardening pass — see the [plan](../production-readiness-plan.md).)

Every owner-scoped query filters on `userId` from `requireUserId()`. Mutations additionally re-check ownership with helpers like `assertProgramOwned` / `assertSessionOwned` before writing (see [Data Layer](data-layer.md#ownership-checks)).

### First sign-in seeding

New users have no programs. On the first dashboard load, `app/page.tsx` calls `ensureUserSeeded(userId)` ([`lib/onboarding.ts`](data-layer.md)), which gives the user a **personal copy** of the default *Maximal Growth — Upper/Lower 4 Days* program (`db/seed-program.ts`) wired to the shared catalog. It's safe to call on every load — it no-ops once a program exists, and the `(userId, slug)` unique index guards against a double-seed from concurrent first requests.

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon/Postgres connection string (auth tables live here too) |
| `BETTER_AUTH_SECRET` | signing secret — generate a long random string |
| `BETTER_AUTH_URL` | the public origin the app is served on (e.g. `https://gym-track.example.com`) |

See [Deployment](deployment.md) and `.env.example`.
