# Deployment & Ops

[← Wiki Home](README.md)

GymTrack deploys via **Nixpacks** on **Dokploy**, against a **Neon/Postgres** database. Deploys are self-bootstrapping: migrations and the catalog seed run automatically before the server boots.

## Build & start (`nixpacks.toml`)

Nixpacks auto-detects the build (`npm ci` → `npm run build`). The custom start command is:

```toml
[start]
cmd = "npm run db:migrate && npm run db:seed && npm run start"
```

So on every boot, in order:

1. **`db:migrate`** — applies pending Drizzle migrations (`db/migrate.ts` over Neon HTTP).
2. **`db:seed`** — idempotent shared-exercise-catalog seed (`db/seed.ts`).
3. **`start`** — `next start`.

The `&&` chain is intentional: if migration fails the server never starts, surfacing the problem instead of running against a stale schema.

## Environment variables

Set these in Dokploy (and in `.env.local` for local dev — see [Development](development.md)). Template in `.env.example`.

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon/Postgres connection string (`?sslmode=require`) |
| `BETTER_AUTH_SECRET` | Auth signing secret — a long random string (`openssl rand -base64 48`) |
| `BETTER_AUTH_URL` | The public HTTPS origin the app is served on |

## Database & migrations

- **Schema source of truth:** `db/schema.ts` + `db/auth-schema.ts` ([Data Model](data-model.md)).
- **Config:** `drizzle.config.ts` (postgresql dialect, output `./db/migrations`).
- **Generate a migration** after editing the schema: `npm run db:generate` (drizzle-kit) → writes SQL + snapshot under `db/migrations/`.
- **Apply migrations:** `npm run db:migrate` (`tsx db/migrate.ts`). Locally pass env, e.g. `npx dotenv -e .env.local -- npm run db:migrate`.
- **Driver:** Neon serverless **HTTP** driver (`drizzle-orm/neon-http`) — works in serverless/edge contexts without a persistent connection.

### Seeding

- `npm run db:seed` (`db/seed.ts`) seeds the **shared exercise catalog**. It's **idempotent** — it only inserts catalog entries not already present (matched by name), so it's safe to run on every deploy.
- Per-user starter **programs** are *not* seeded at deploy time — they're created on a user's first sign-in by `ensureUserSeeded` / `seedProgramForUser`. See [Auth & Roles](auth-and-roles.md).

### One-off scripts

- `db/backfill-slugs.ts` — historical migration helper that added + backfilled `programs.slug` and its unique index. Already applied; kept for reference.

## Operational notes

- **A deploy needs no manual DB steps** — migrate + seed are part of boot.
- **Rollback caution:** because migrations run on boot, rolling the app back does *not* roll back the schema. Treat migrations as forward-only.
- **`next.config.ts`** is currently empty (defaults).
- The repo also carries Vercel tooling/skills, but the documented production path is Nixpacks/Dokploy. Recent commits show the Dokploy auto-deploy webhook being wired up.
