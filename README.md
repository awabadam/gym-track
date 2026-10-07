# GymTrack

A workout tracker for lifters and their coaches. Build training programs, log sessions set by set, and follow your progress, with a trainer-to-client coaching layer and an admin console on top.

**Live:** [gym.awab.design](https://gym.awab.design)

## Features

- **Fast set logging.** A one-handed logger with a rest timer and screen wake lock, built for use between sets.
- **Progression targets.** Each exercise suggests the next weight and reps based on your last session.
- **Programs.** Build programs from days and exercises, or start from a seeded template.
- **Exercise catalog.** Shared system exercises with primary and secondary muscle data, plus your own custom exercises.
- **Progress analytics.** Body-map volume charts, estimated one-rep max (e1RM) trends, personal records and strength goals.
- **History.** Past workouts in a list and on a calendar.
- **Coaching.** Users can become trainers, invite clients with codes, assign programs and leave coach notes.
- **Admin console.** User management, catalog management and trainer approvals.
- **Installable PWA.**

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, React Server Components, Server Actions) and TypeScript
- [Drizzle ORM](https://orm.drizzle.team/) on Postgres ([Neon](https://neon.tech/))
- [Better Auth](https://www.better-auth.com/) (email and password) with user, trainer and admin roles
- [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/) with a custom brutalist theme
- Deployed with Nixpacks on [Dokploy](https://dokploy.com/)

Reads go through a `data/` layer and writes through Server Actions. The app has no REST API of its own apart from Better Auth's handler.

## Getting started

Requires Node.js (see `.nvmrc`) and a Postgres database.

```bash
git clone https://github.com/awabadam/gym-track.git
cd gym-track
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate
npm run db:seed
npm run dev
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Random secret for session signing (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Base URL of the app, e.g. `http://localhost:3000` |

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed the exercise catalog and programs |
| `npm run db:import-exercises` | Import the enriched exercise dataset |

## Documentation

The engineering wiki in [`docs/wiki/`](docs/wiki/README.md) covers the architecture, data model, auth and roles, every feature area, and deployment.

## Author

**Awab Elkhalil** · [awab.design](https://awab.design)
