# Architecture

[← Wiki Home](README.md)

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16** (App Router) | Server Components by default; Server Actions for mutations. Note: in Next 16 middleware is called **`proxy`** (see [Auth](auth.md)). |
| Language | **TypeScript** | Path alias `@/*` → repo root. |
| UI runtime | **React 19** | |
| Styling | **Tailwind CSS v4** + **shadcn** primitives | Brutalist theme — see [Design System](design-system.md). |
| ORM | **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`) | Schema-first, SQL migrations. |
| Database | **Postgres** via **Neon serverless HTTP driver** (`@neondatabase/serverless`) | `drizzle-orm/neon-http`. |
| Auth | **Better Auth** (`better-auth`) | Email + password. See [Auth](auth.md). |
| Icons | `lucide-react` | |
| Deploy | **Nixpacks** on **Dokploy** | See [Deployment](deployment.md). |

## The big picture

```
                 Browser
                    │
         ┌──────────┴───────────┐
         │   proxy.ts (Next 16   │   optimistic cookie-presence redirects
         │   "middleware"/proxy) │   (real auth happens in the data layer)
         └──────────┬───────────┘
                    │
            ┌───────┴────────┐
            │  App Router     │
            │  app/**/page.tsx│  Server Components (async, run on server)
            └───┬────────┬────┘
                │        │
       reads    │        │   writes (form actions / button handlers)
                ▼        ▼
        ┌─────────────┐ ┌──────────────────┐
        │  data/*.ts  │ │ app/actions/*.ts │  "use server"
        │ (read fns)  │ │ (Server Actions) │
        └──────┬──────┘ └────────┬─────────┘
               │                 │
        lib/auth requireUserId() │  every fn scopes to the signed-in user
               │                 │
               ▼                 ▼
            ┌────────────────────────┐
            │   db (Drizzle + Neon)  │
            └────────────────────────┘
                       │
                  Postgres (Neon)
```

## Request & render flow

1. **`proxy.ts`** runs first on most paths. It does a cheap **cookie-presence** check only: signed-out users hitting a protected route are bounced to `/sign-in`; signed-in users hitting `/sign-in` or `/sign-up` are bounced home. It does **not** validate the session — that's deliberate. See [Auth](auth.md).
2. **`app/layout.tsx`** (a Server Component) calls `auth.api.getSession()`. If there's no session it renders the page full-bleed (landing/auth pages own their layout); if there is, it wraps the page in the app shell (sidebar + header + bottom nav).
3. The **page** (Server Component) reads data by calling functions in [`data/`](data-layer.md). Each of those calls `requireUserId()` and filters every query by the current user — this is the real authorization boundary.
4. **Mutations** happen through [Server Actions](data-layer.md#write-path-server-actions) in `app/actions/`. They check ownership, validate input (Zod), write via Drizzle, then `revalidatePath()` the affected routes and often `redirect()`.

## Directory layout

```
app/                  App Router routes (see Routes & Pages)
  actions/            "use server" mutation functions (write path)
  api/auth/[...all]/  Better Auth catch-all route (the only API route)
data/                 Read-only query functions (read path)
lib/                  auth, calculations, progression, formatting, slug, onboarding, validation
db/                   schema, drizzle client, migrations, seeds
components/
  shared/             app-specific components
  ui/                 shadcn primitives
  auth/ landing/      auth form + marketing landing
hooks/                use-mobile
proxy.ts              Next 16 "middleware" (cookie-presence redirects)
docs/                 this wiki + analysis docs
```

## Key design decisions

- **No REST/GraphQL API.** Reads are direct DB calls inside Server Components; writes are Server Actions. The only route under `app/api` is Better Auth's `[...all]` handler.
- **Authorization lives in the data/action layer, not the proxy.** `requireUserId()` is the single source of truth and every query/mutation is scoped by `userId`. The proxy is purely an optimistic UX redirect. See [Auth](auth.md).
- **System exercise catalog + per-user custom, private everything else.** Shared "system" exercises (`userId IS NULL`) are read-only to users; custom exercises and all programs/sessions are per-user. See [Data Model](data-model.md).
- **Inputs validated at the action boundary.** Every Server Action runs its `FormData`/arguments through a Zod schema (`lib/validation.ts`) before touching the DB. See [Data Layer](data-layer.md#input-validation).
- **Error boundaries everywhere.** `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` keep uncaught errors and bad URLs from surfacing as raw crash screens. See [Routes](routes.md).
- **Self-bootstrapping deploys.** The start command runs migrations + an idempotent catalog seed before booting, so a deploy needs no manual DB steps. See [Deployment](deployment.md).
