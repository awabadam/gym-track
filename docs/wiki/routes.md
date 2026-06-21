# Routes & Pages

[← Wiki Home](README.md)

All routes are App Router segments under `app/`. Pages are **Server Components** unless noted. Dynamic params and `searchParams` are Promises (Next 16) and are awaited. Data comes from [`data/`](data-layer.md); mutations are [Server Actions](data-layer.md#write-path-server-actions).

## Layout & globals

| File | Role |
|------|------|
| `app/layout.tsx` | Root layout. Loads fonts (Archivo Black display, Space Mono body), sets metadata + viewport + PWA tags, injects a pre-paint theme script (light/dark from `localStorage`). Calls `getSession()`: **signed-out** → renders children full-bleed; **signed-in** → app shell (`AppSidebar` + `AppHeader` + `BottomNav`, `SidebarProvider`/`SidebarInset`, skip-to-content link). |
| `app/manifest.ts` | PWA manifest (standalone display, `#171717` theme, `/icon.svg`). |
| `app/loading.tsx` | Global Suspense skeleton. Per-route `loading.tsx` files exist for `/exercises`, `/log`, `/programs`, `/progress`, `/workout`. |
| `app/error.tsx` | Client error boundary for uncaught render errors in the app shell. Uses Next 16.2's `unstable_retry`; offers retry + go-home. |
| `app/global-error.tsx` | Last-resort boundary catching errors in the root layout itself; renders its own `<html>/<body>`, inline-styled. |
| `app/not-found.tsx` | 404 UI for unmatched routes and any `notFound()` call (missing or not-owned resource). |
| `app/globals.css` | Tailwind v4 + theme tokens — see [Design System](design-system.md). |

## Route table

| URL | File | Reads | Mutates | Renders |
|-----|------|-------|---------|---------|
| `/` | `page.tsx` | `getActiveProgram`, `getRecentSessions(5)`, `getInProgressSession`, `getSessionsForCurrentWeek`, `getSessionsInRange`; `ensureUserSeeded` on first load | — | **Signed-out:** `KineticLanding`. **Signed-in:** dashboard — stat strip, in-progress/today's-workout/rest block, week strip, `WorkoutCalendar`, recent sessions. |
| `/sign-in` | `sign-in/page.tsx` | — | `signIn.email` (client) | `AuthForm mode="sign-in"`, full-bleed |
| `/sign-up` | `sign-up/page.tsx` | — | `signUp.email` (client) | `AuthForm mode="sign-up"`, full-bleed |
| `/programs` | `programs/page.tsx` | `getPrograms` | `setActiveProgram`, `duplicateProgram` | Program cards (active badge, set-active/duplicate/view); empty state |
| `/programs/new` | `programs/new/page.tsx` | — | `createProgram` | Create form (name, description, targetRir) → redirects to edit |
| `/programs/[slug]` | `programs/[slug]/page.tsx` | `getProgramBySlug` | — | Read-only program: days, per-day exercise tables, superset badges, weekly volume-per-muscle summary |
| `/programs/[slug]/edit` | `programs/[slug]/edit/page.tsx` | `getProgramBySlug`, `getAllExercises` | the full `programs.ts` action set (update, set-active, add/update/delete/reorder day & exercise, duplicate day, delete program) | Full editor: details form, per-day exercise management, add-day, danger zone |
| `/exercises` | `exercises/page.tsx` | `getExercises`, `getMuscleGroups` | `createExercise` (via dialog) | Searchable, muscle-filtered, paginated catalog (20/page). `q`, `muscle`, `page` search params. Search/filter/pagination Suspense-wrapped |
| `/exercises/[id]` | `exercises/[id]/page.tsx` | `getExerciseById`, `getExerciseHistory`, `getExerciseStats` (+ `bestEstimated1RM`, `totalVolume`) | `updateExercise`, `deleteExercise` (via actions) | Stat cards, program usage, e1RM + volume `LineChart`s, last-20-session history |
| `/log` | `log/page.tsx` | `getRecentSessionsWithSetCount`, `getAllProgramDays` | `startPastSession` (dialog), `deleteSession` | Sessions grouped by date with set counts + status; `page` param; "add past workout" dialog |
| `/log/[sessionId]` | `log/[sessionId]/page.tsx` | (delegates) | (delegates) | `SessionDetail section="log"`; `?edit=1` enables edit mode (read-only history otherwise) |
| `/workout` | `workout/page.tsx` | `getActiveProgram`, `getInProgressSession`, `getLastSessionDatePerDay` | `startSession` (per-day form) | Resume banner if in-progress; else day picker (each day a START form); empty state if no active program |
| `/workout/[sessionId]` | `workout/[sessionId]/page.tsx` | (delegates) | (delegates) | `SessionDetail section="workout"` — live set logging |
| `/progress` | `progress/page.tsx` | `getActiveProgram`, `getProgressForProgram` | — | Weekly volume bar summary + per-muscle-group progress table with e1RM sparklines and "next move" recommendations; empty state if no active program |
| `/api/auth/[...all]` | `api/auth/[...all]/route.ts` | — | — | Better Auth catch-all (`GET`/`POST` via `toNextJsHandler`). The only API route. See [Auth](auth.md) |

## Shared session view

`/log/[sessionId]` and `/workout/[sessionId]` are thin wrappers over one component — [`components/shared/session-detail.tsx`](components.md) — parameterized by `section` (`"log"` vs `"workout"`) and an `edit` flag. That component renders the day's plan, the set loggers (live in workout, editable history in log), progression suggestions, and the complete/cancel controls.

## Conventions

- **Dynamic params & searchParams are awaited Promises** (Next 16).
- **Suspense boundaries** wrap search/filter/pagination so the rest of the page streams.
- **Mutation → `revalidatePath` → `redirect`** is the standard action shape (see [Data Layer](data-layer.md#write-path-server-actions)).
- Pages assume authentication; the boundary is enforced in the data layer, not the page. See [Auth](auth.md).
