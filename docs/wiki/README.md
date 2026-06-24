# GymTrack Wiki

The engineering reference for **GymTrack** — a workout tracker that lets a lifter build training programs, log sessions set-by-set, and get progression recommendations based on their history.

This wiki documents how the app actually works today. Start here and follow the links.

## Map

| Page | What it covers |
|------|----------------|
| [Architecture](architecture.md) | Tech stack, the big picture, request/render flow |
| [Data Model](data-model.md) | Every table, the relationships, and why they're shaped that way |
| [Auth & Multi-Tenancy](auth.md) | Better Auth, admin roles, the proxy (middleware), and how data is scoped per user |
| [Roles & Trainers](roles-and-trainers.md) | **Planned** — the target three-role model (user / trainer / admin) and the trainer↔client system |
| [Data Layer](data-layer.md) | The `data/` read functions and `app/actions/` write functions |
| [Progression Engine](progression-engine.md) | Double progression, estimated 1RM, stall detection |
| [Routes & Pages](routes.md) | Every URL, what it renders, what it reads and mutates |
| [Components](components.md) | The shared/UI component catalog |
| [Design System](design-system.md) | The brutalist theme, tokens, fonts, and motion |
| [Deployment & Ops](deployment.md) | Nixpacks/Dokploy, env vars, migrations, seeding |
| [Local Development](development.md) | Getting it running, scripts, the DB workflow |

> **Production hardening in progress.** Tier-1 work (exercise ownership, action input validation, error boundaries) is done, and an [admin console](auth.md#admin-roles) (users + recommended exercises/programs) is built. Auth hardening (Slice 4) is paused. See the live [Production-Readiness Plan](../production-readiness-plan.md).

## One-paragraph summary

GymTrack is a [Next.js 16](architecture.md) App Router app written in TypeScript. It uses [Drizzle ORM](data-model.md) over a Neon/Postgres database, [Better Auth](auth.md) for email + password sign-in, and React Server Components throughout — reads go through a [data layer](data-layer.md) and writes through [Server Actions](data-layer.md#write-path-server-actions), with no REST API of its own (the only API route is Better Auth's catch-all). Every user gets a private copy of a starter program on first sign-in; the [exercise catalog](data-model.md#exercises-shared-catalog--custom) mixes shared read-only "system" exercises with per-user custom ones. The signature feature is the [progression engine](progression-engine.md), which reads your last session for an exercise and tells you whether to add weight, push reps, or hold. The UI is a deliberately [brutalist design system](design-system.md) (hard corners, offset shadows, mono + display type).

## Existing analysis docs

These predate the wiki and capture point-in-time analysis rather than how things work today, but they're useful background:

- [`../research.md`](../research.md) — competitive analysis of Strong, Hevy, etc. and the UX patterns they informed
- [`../frontend-audit.md`](../frontend-audit.md) — design audit that led to the current brutalist direction
- [`../review.md`](../review.md) — a full UX/UI review with a bug + improvement checklist
- [`../ux-improvements.md`](../ux-improvements.md) — UX improvement notes
- [`../design-explorations/`](../design-explorations/) — five HTML design mockups explored before settling on the current look
