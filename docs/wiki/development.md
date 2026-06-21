# Local Development

[← Wiki Home](README.md)

## Prerequisites

- **Node ≥ 20.9** (`.nvmrc` present; `engines.node >= 20.9.0`).
- A **Postgres** database — Neon is what production uses; any Postgres reachable over the Neon HTTP driver works. The connection string goes in `DATABASE_URL`.

## Setup

1. Install deps: `npm install`
2. Create `.env.local` from the template:
   ```
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   BETTER_AUTH_SECRET=<long random string>
   BETTER_AUTH_URL=http://localhost:3000
   ```
   (`.env.example` documents these. Generate the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.)
3. Apply the schema: `npx dotenv -e .env.local -- npm run db:migrate`
4. Seed the shared exercise catalog: `npx dotenv -e .env.local -- npm run db:seed`
5. Run it: `npm run dev` → http://localhost:3000
6. Sign up — your first dashboard load auto-creates your personal starter program ([Auth](auth.md#first-sign-in-seeding)).

## Scripts (`package.json`)

| Script | Does |
|--------|------|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed the shared exercise catalog (idempotent) |

`tsx` runs the TS db scripts directly. `dotenv-cli` (`npx dotenv -e .env.local -- …`) injects local env into them.

## Working in the codebase

> **Read `AGENTS.md` first.** It warns that this is **Next.js 16** with breaking changes from older versions — the relevant guides live in `node_modules/next/dist/docs/`. Don't assume older Next APIs. The most visible example: middleware is now **`proxy.ts`** ([Auth](auth.md#the-proxy-next-16-middleware-proxyts)).

Common changes, and where they land:

| Task | Where |
|------|-------|
| New page / route | `app/**/page.tsx` — see [Routes](routes.md). Params/searchParams are awaited Promises |
| New read query | `data/*.ts` — start with `requireUserId()`, scope by `userId`. See [Data Layer](data-layer.md) |
| New mutation | `app/actions/*.ts` — `"use server"`, ownership check, **validate via a `lib/validation.ts` schema (`parseForm`/`parse`)**, write, `revalidatePath`. See [Data Layer](data-layer.md#write-path-server-actions) |
| Input validation | add/extend a Zod schema in `lib/validation.ts`. See [Input validation](data-layer.md#input-validation) |
| Schema change | edit `db/schema.ts` → `db:generate` → `db:migrate`. See [Data Model](data-model.md) |
| Progression / stats math | `lib/calculations.ts`, `lib/progression.ts`. See [Progression Engine](progression-engine.md) |
| UI / styling | reuse `Block`/`PageHeader`, semantic tokens. See [Design System](design-system.md) and [Components](components.md) |
| shadcn primitive | `components/ui/` via shadcn (`components.json`) |

## Testing

`vitest` is a dev dependency but there is **no test script wired up** and no test files in the tree yet. The pure logic in `lib/calculations.ts` and `lib/progression.ts` is the natural first target for unit tests.

## Conventions recap

- Path alias `@/*` → repo root.
- Reads in Server Components via `data/`; writes via Server Actions in `app/actions/`. No bespoke API routes (only Better Auth's catch-all).
- Every owner-scoped query/mutation goes through `requireUserId()` ([Auth](auth.md)).
- Every mutation validates its input through a `lib/validation.ts` (Zod) schema before writing.

## Production-hardening status

Tier-1 hardening (exercise ownership, input validation, error boundaries) is done; auth hardening is paused. The live tracker is [`../production-readiness-plan.md`](../production-readiness-plan.md).
