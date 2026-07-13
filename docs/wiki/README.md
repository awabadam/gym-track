# GymTrack Wiki

The engineering reference for **GymTrack** — a workout tracker where lifters build training programs, log sessions set-by-set, and track progress, with a full **trainer↔client** coaching layer and an **admin** console on top.

This wiki documents how the app actually works today. Every page is written against the current source (`path:line` citations throughout). Start here and follow the links.

## Map

### Foundations
| Page | What it covers |
|------|----------------|
| [Architecture](architecture.md) | Tech stack, route groups, the `data/` + `app/actions/` layering, the `proxy.ts` routing gate, request/render flow |
| [Data Model](data-model.md) | Every table, columns, relationships, the migrations, and the seed/import scripts |
| [Auth & Roles](auth-and-roles.md) | Better Auth (email+password), the user/trainer/admin roles, guard helpers, route protection, per-user data scoping, invites |

### Features
| Page | What it covers |
|------|----------------|
| [Programs & Exercises](programs-and-exercises.md) | The shared exercise catalog, muscle targeting, and the program → day → exercise builder |
| [Workout Logging](workout-logging.md) | Session lifecycle, the set logger, rest timer/wake lock, progression engine, past workouts & calendar |
| [Progress & Goals](progress-and-goals.md) | Home dashboard, progress analytics & body maps, strength PRs and goals, the calculations |
| [Trainer Features](trainer-features.md) | Becoming a trainer, invite codes, the coach console, coach notes, assigning client programs |
| [Admin Features](admin-features.md) | User management, catalog management, trainer approvals, and how the admin area is gated |
| [UI & Components](ui-components.md) | The shadcn primitives, brutalist theming, nav shell, PWA plumbing, notifications, hooks, landing page |

### Operations
| Page | What it covers |
|------|----------------|
| [Deployment & Ops](deployment.md) | Nixpacks/Dokploy, env vars, boot-time migrate + seed |
| [Local Development](development.md) | Getting it running, scripts, the DB workflow |

## One-paragraph summary

GymTrack is a [Next.js 16](architecture.md) App Router app in TypeScript, using [Drizzle ORM](data-model.md) over Neon/Postgres and [Better Auth](auth-and-roles.md) for email + password sign-in, with React Server Components throughout — reads flow through a [`data/` layer](architecture.md) and writes through [Server Actions](architecture.md), with no REST API of its own (only Better Auth's catch-all). It's a [three-role platform](auth-and-roles.md): regular **users** build [programs](programs-and-exercises.md) and [log workouts](workout-logging.md), **trainers** coach clients through a [coach console](trainer-features.md), and **admins** manage users and the shared catalog via an [admin console](admin-features.md). The [exercise catalog](programs-and-exercises.md) mixes shared system exercises (with fine-grained primary/secondary muscle metadata) with per-user custom ones, and progress is surfaced through [body-map volume charts, e1RM trends, and strength goals](progress-and-goals.md). The look is a deliberately [brutalist design system](ui-components.md) — hard corners, offset shadows, mono + display type.

## Background docs

These predate the wiki and capture point-in-time analysis rather than current behavior, but they're useful background:

- [`../research.md`](../research.md) — competitive analysis (Strong, Hevy, …) and the UX patterns they informed
- [`../frontend-audit.md`](../frontend-audit.md) — design audit that led to the brutalist direction
- [`../review.md`](../review.md) — UX/UI review with a bug + improvement checklist
- [`../ux-improvements.md`](../ux-improvements.md) — UX improvement notes
- [`../design-explorations/`](../design-explorations/) — HTML design mockups explored before the current look
- [`../superpowers/specs/`](../superpowers/specs/) — design specs for recent features (goals page, exercise-dataset enrichment)
