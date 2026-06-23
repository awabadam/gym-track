# Routes & Pages

[← Wiki Home](README.md)

All routes are App Router segments under `app/`. Pages are **Server Components** unless noted. Dynamic params and `searchParams` are Promises (Next 16) and are awaited. Data comes from [`data/`](data-layer.md); mutations are [Server Actions](data-layer.md#write-path-server-actions).

### Route groups

The app is split into two **route groups** so the user app and the admin console get separate shells (URLs are unchanged — the `(group)` folders don't appear in the path):

- **`app/(app)/`** — the normal app (dashboard, workout, programs, exercises, log, progress, auth screens). Wrapped by the app shell.
- **`app/(admin)/`** — the admin console (`/admin*`). Wrapped by a distinct admin shell, gated to admins. See [Auth](auth.md#admin-roles).

## Layout & globals

| File | Role |
|------|------|
| `app/layout.tsx` | **Root layout** — minimal: loads fonts (Archivo Black display, Space Mono body), metadata + viewport + PWA tags, the pre-paint theme script (light/dark from `localStorage`), and renders `children`. No session/shell logic (that lives in the group layouts). |
| `app/(app)/layout.tsx` | App shell. Calls `getSession()`: **signed-out** → renders children full-bleed (landing/auth own their layout); **signed-in** → `AppSidebar` + `AppHeader` + `BottomNav` (`SidebarProvider`/`SidebarInset`, skip-to-content link). Passes `isAdmin` to the sidebar. |
| `app/(admin)/layout.tsx` | Admin shell. Re-checks admin (`userIsAdmin`, else `redirect("/")`), then renders `AdminSidebar` + a header (theme toggle, "Exit to app") and, on mobile, an `AdminNav` row. Same brutalist `SidebarProvider`/`SidebarInset` structure as the app. |
| `app/manifest.ts` | PWA manifest (standalone display, `#171717` theme, `/icon.svg`). |
| `app/(app)/loading.tsx` | Global Suspense skeleton for the app. Per-route `loading.tsx` files exist for `/exercises`, `/log`, `/programs`, `/progress`, `/workout`. |
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
| `/admin` | `(admin)/admin/page.tsx` | `listUsersForAdmin` | `createUser`, `setUserRole`, `banUser`/`unbanUser`, `setUserPassword`, `removeUser`, `impersonateUser` | **Admin** — user management: searchable user table (role/ban/joined), create-user dialog, per-row actions menu. Self-action guards prevent lockout |
| `/admin/exercises` | `(admin)/admin/exercises/page.tsx` | `listRecommendedExercises` | `createRecommendedExercise`, `updateRecommendedExercise`, `deleteRecommendedExercise` | **Admin** — CRUD over the shared recommended exercise catalog (`exercises.userId IS NULL`); guarded delete |
| `/admin/programs` | `(admin)/admin/programs/page.tsx` | `listRecommendedPrograms` | `createRecommendedProgram` | **Admin** — recommended program templates list + create dialog |
| `/admin/programs/[id]/edit` | `(admin)/admin/programs/[id]/edit/page.tsx` | `getRecommendedProgramById`, `getAllRecommendedExercises` | `updateRecommendedProgram`, `deleteRecommendedProgram`, + the shared day/exercise builder actions | **Admin** — full template builder (details, days, exercises) reusing the program-builder components |
| `/api/auth/[...all]` | `api/auth/[...all]/route.ts` | — | — | Better Auth catch-all (`GET`/`POST` via `toNextJsHandler`); now includes the admin-plugin endpoints (`/api/auth/admin/*`). The only API route. See [Auth](auth.md) |

## Shared session view

`/log/[sessionId]` and `/workout/[sessionId]` are thin wrappers over one component — [`components/shared/session-detail.tsx`](components.md) — parameterized by `section` (`"log"` vs `"workout"`) and an `edit` flag. That component renders the day's plan, the set loggers (live in workout, editable history in log), progression suggestions, and the complete/cancel controls.

## Conventions

- **Dynamic params & searchParams are awaited Promises** (Next 16).
- **Suspense boundaries** wrap search/filter/pagination so the rest of the page streams.
- **Mutation → `revalidatePath` → `redirect`** is the standard action shape (see [Data Layer](data-layer.md#write-path-server-actions)).
- Pages assume authentication; the boundary is enforced in the data layer, not the page. See [Auth](auth.md).
