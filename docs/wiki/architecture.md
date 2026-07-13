# Architecture & Project Overview

GymTrack is a Next.js 16 workout-tracking web app (React 19, App Router) that lets users build training programs, log sessions, and track progress, with elevated **trainer** (coach) and **admin** consoles layered on top of the same codebase. Data lives in Postgres (Neon) accessed through Drizzle ORM, auth is handled by Better Auth, and the UI is Tailwind CSS v4 with shadcn/Radix primitives. Server work is split cleanly between **read queries** (`data/*`) and **write mutations** (`app/actions/*`), both of which scope every operation to the signed-in user.

> This project pins a modified/newer Next.js (`next@16.2.9`, `package.json:23`) where conventions differ from older versions — most visibly, middleware is now `proxy.ts` and error boundaries receive an `unstable_retry` prop. Everything below is verified against the code as of this writing.

## Tech stack

Confirmed from `package.json` and the config files:

| Concern | Choice | Evidence |
| --- | --- | --- |
| Framework | Next.js `16.2.9`, React `19.2.4` (App Router) | `package.json:23,25` |
| Language / TS | TypeScript 5, `strict`, `moduleResolution: "bundler"`, `@/*` → repo root | `tsconfig.json:7,11,21-23` |
| Database | Postgres via Neon serverless HTTP driver | `package.json:16`, `db/index.ts:1-7` |
| ORM / migrations | Drizzle ORM `0.45.2` + drizzle-kit; schema split `db/schema.ts` + `db/auth-schema.ts` | `package.json:21,40`, `drizzle.config.ts:5-9` |
| Auth | Better Auth `1.6.19` (email+password) + `admin` plugin (roles user/admin/trainer) | `package.json:17`, `lib/auth.ts:18-42` |
| Styling / UI | Tailwind CSS v4, shadcn (`radix-nova` style), Radix UI, lucide icons, `tw-animate-css` | `package.json:24,28,31,35,43`, `components.json:3,13` |
| Validation | Zod `4.x` | `package.json:32`, `lib/validation.ts` |
| Body maps / charts | `react-body-highlighter` (muscle maps) + custom `line-chart`/`sparkline` | `package.json:26` |
| Fonts | `next/font/google` — Archivo Black (display) + Space Mono | `app/layout.tsx:2-15` |
| Deploy | Nixpacks on Dokploy; start runs migrate → seed → start | `nixpacks.toml:13-14` |

`next.config.ts` is an empty config object — there is **no** custom Next config (`next.config.ts:3-5`). The `README.md` is stock create-next-app boilerplate and does not describe this app.

## Directory layout & conventions

### Route groups under `app/`

Three parenthesized route groups partition the app by audience. Route groups don't affect the URL, so `/admin` and `/clients` sit at the root path while being isolated behind separate layouts and access gates. Each group's `layout.tsx` renders its own shell and enforces its own gate:

- **`app/(app)/`** — the end-user product: dashboard (`page.tsx`), `programs`, `exercises`, `progress`, `goals`, `log`, `workout`, `notifications`, plus `sign-in`/`sign-up`, `join`, `become-a-trainer`, `coach`. Its layout fetches the session and, **if signed out, renders children full-bleed** with no app shell (auth screens and the landing page own their own layout); if signed in it wraps children in the sidebar + header + bottom-nav shell and passes `isAdmin`/`isTrainer` into the nav (`app/(app)/layout.tsx:14-49`).
- **`app/(admin)/`** — the admin console (`/admin`, `/admin/exercises`, `/admin/programs`, `/admin/trainers`). Its layout **hard-gates the whole group**: `redirect("/")` unless `userIsAdmin(session.user)` (`app/(admin)/layout.tsx:18-19`).
- **`app/(trainer)/`** — the coach console (`/clients`, with nested `[clientId]` program-edit and session views). Its layout redirects unless `session.user.role === "trainer"` — admins are deliberately **not** treated as trainers here (`app/(trainer)/layout.tsx:18-19`).

Dynamic segments use the `[id]` / `[clientId]` / `[...all]` conventions (e.g. `app/api/auth/[...all]/route.ts`).

### The data / actions / components split

- **`data/*`** — read-only query functions (server-side). Each starts with `const uid = await requireUserId()` and scopes every query to that id, so authorization lives inside the query (e.g. `data/programs.ts:21,37,52`). Files mirror domains: `programs`, `sessions`, `exercises`, `progress`, `goals`, `trainer`, `admin`, `notifications`.
- **`app/actions/*`** — write mutations, each file marked `"use server"` (`app/actions/exercises.ts:1`). Pattern: validate `FormData` with Zod via `parseForm(schema, formData)`, re-check ownership (e.g. `assertExerciseOwned`, `app/actions/exercises.ts:15-22`), write via Drizzle, then `revalidatePath(...)` the affected routes (`app/actions/exercises.ts:32,46-47`). Trainer/admin actions gate with `requireTrainer()` / `requireAdmin()` instead of `requireUserId()`.
- **`components/ui/*`** — generic shadcn/Radix primitives (`button`, `dialog`, `sidebar`, `table`, `tabs`, `tooltip`, …), managed by shadcn (`components.json`).
- **`components/shared/*`** — app-specific composite components (`app-sidebar`, `session-detail`, `set-logger`, `rest-timer`, `muscle-volume-map`, `program-week-builder`, …). Also `components/auth/auth-form.tsx` and `components/landing/kinetic-landing.tsx`.
- **`lib/*`** — cross-cutting helpers: `auth.ts` (session gates), `validation.ts` (Zod schemas + `parseForm`), `muscles.ts`, `calculations.ts`, `progression.ts`, `format.ts`, `slug.ts`, `invite.ts`, `onboarding.ts`, `utils.ts` (`cn` = clsx + tailwind-merge, `lib/utils.ts:4-6`).
- **`hooks/*`** — a single hook, `use-mobile.ts` (`useIsMobile`, a 768px media-query store, `hooks/use-mobile.ts:12-18`).

**Naming conventions:** files are kebab-case; `data/` and `app/actions/` files are named by domain and usually mirror each other (`data/programs.ts` ↔ `app/actions/programs.ts`). The `@/` path alias resolves to the repo root (`tsconfig.json:21-23`), so imports read `@/lib/auth`, `@/db`, `@/components/ui/...`.

## Request lifecycle & routing gate

1. **`proxy.ts` (the Next 16 rename of middleware)** runs first on nearly every request. It performs only **optimistic** redirects based on the *presence* of the Better Auth session cookie (`getSessionCookie`, `proxy.ts:22`) — it does **not** validate the session. Signed-out users hitting a non-public route are sent to `/sign-in` (`proxy.ts:25-27`); signed-in users hitting `/sign-in` or `/sign-up` are bounced to `/` (`proxy.ts:29-31`). Public paths are `/`, `/join`, `/join/*`, and the auth pages (`proxy.ts:17-21`). The matcher excludes `api/auth`, Next internals, and static assets (`proxy.ts:35-40`).
2. **Root layout** (`app/layout.tsx`) sets `<html>`/`<body>`, loads fonts, injects a pre-paint theme script to avoid a light/dark flash (`app/layout.tsx:18,56`), and declares metadata/PWA viewport.
3. **Group layout** runs the *real* server-side authorization check. `(app)` branches on session presence; `(admin)` and `(trainer)` `redirect("/")` on the wrong role. This is where the app shell (sidebar/header/bottom-nav) is composed.
4. **Page / data layer.** Server Components call `data/*` queries; mutations run through `app/actions/*`. Real session validation is enforced **here**, not in the proxy — `requireUserId()` / `requireAdmin()` / `requireTrainer()` throw if the caller isn't authorized (`lib/auth.ts:49-99`), so every read and write is independently gated even after the proxy redirect. The `proxy.ts:7-9` comment makes this two-tier design explicit ("real session validation happens in the data layer").

Auth API requests are served by a Better Auth catch-all handler (`app/api/auth/[...all]/route.ts:1-4`, `toNextJsHandler(auth)`) — the only route under `app/api`, and one the proxy matcher intentionally skips.

**Error & fallback boundaries:** `app/error.tsx` (client boundary, receives `error` + `unstable_retry`, `app/error.tsx:9-15`), `app/global-error.tsx` (last-resort boundary rendering its own `<html>/<body>` with inline styles, `app/global-error.tsx:8-14`), `app/not-found.tsx` (unmatched routes and `notFound()` calls), plus `app/manifest.ts` for the PWA manifest.

## Key files

| Path | Purpose |
| --- | --- |
| `proxy.ts` | Next 16 middleware: optimistic cookie-presence auth redirects + route matcher |
| `app/layout.tsx` | Root layout — fonts, metadata, PWA viewport, anti-FOUC theme script |
| `app/(app)/layout.tsx` | End-user app shell; renders full-bleed when signed out |
| `app/(admin)/layout.tsx` | Admin console shell + admin-only redirect gate |
| `app/(trainer)/layout.tsx` | Coach console shell + trainer-only redirect gate |
| `lib/auth.ts` | Better Auth config + `requireUserId`/`requireAdmin`/`requireTrainer`/`userIsAdmin` gates |
| `db/index.ts` | Drizzle client over Neon serverless HTTP |
| `db/schema.ts`, `db/auth-schema.ts` | App + auth table definitions (migration source) |
| `drizzle.config.ts` | drizzle-kit config (Postgres dialect, migrations out dir) |
| `data/*.ts` | Per-domain read queries, each scoped via `requireUserId()` |
| `app/actions/*.ts` | Per-domain `"use server"` mutations (validate → check ownership → write → `revalidatePath`) |
| `lib/validation.ts` | Zod schemas + `parseForm(schema, formData)` helper |
| `lib/utils.ts` | `cn()` class-merge helper |
| `components/ui/*` | shadcn/Radix primitives |
| `components/shared/*` | App-specific composite components |
| `app/api/auth/[...all]/route.ts` | Better Auth request handler |
| `nixpacks.toml` | Deploy (Dokploy): start = migrate → seed → start |

## Related pages

- Data model & schema: [./data-model.md](./data-model.md)
- Authentication, roles, and the trainer/admin gates: [./auth-and-roles.md](./auth-and-roles.md)
- UI components, layout shell, and styling: [./ui-components.md](./ui-components.md)
