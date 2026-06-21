# Components

[← Wiki Home](README.md)

Three groups: `components/shared/` (app-specific), `components/ui/` (shadcn primitives), and `components/auth/` + `components/landing/`. "Client" = `"use client"`; everything else is a Server Component.

## `components/shared/`

### Workout logging
| Component | Client | Role |
|-----------|:------:|------|
| `session-detail.tsx` | Server | The unified session view behind both `/workout/[id]` and `/log/[id]`. Renders the day's plan as exercise cards with set loggers (live) or set history (log), wires progression suggestions, allows editing completed sessions. See [Routes](routes.md#shared-session-view) |
| `set-logger.tsx` | ✓ | Compact set input row (weight, reps, tap-to-cycle RIR, check). Calls `logSet`; dispatches a `gymtrack:set-logged` event to auto-start the rest timer |
| `rest-timer.tsx` | ✓ | Sticky timer bar — preset countdowns (1:30/2:00/3:00), stopwatch mode, ±15s, auto-start on set logged, haptics |
| `wake-lock.tsx` | ✓ | Holds a screen wake-lock during a session; re-acquires on tab visibility change |
| `cancel-session-button.tsx` | ✓ | Alert dialog → `cancelSession` |
| `delete-session-button.tsx` | ✓ | Alert dialog → `deleteSession` |
| `add-past-workout-dialog.tsx` | ✓ | Log a past workout by date + day → `startPastSession` |

### Program building
| Component | Client | Role |
|-----------|:------:|------|
| `add-day-form.tsx` | ✓ | Add a program day (auto day-code from name) → `addProgramDay` |
| `day-actions.tsx` | ✓ | Edit (dialog) / delete (alert) a day → `updateProgramDay`, `deleteProgramDay` |
| `add-exercise-form.tsx` | ✓ | Add a catalog exercise to a day (sets, rep range, notes, superset) → `addProgramExercise` |
| `exercise-row-actions.tsx` | ✓ | Reorder/edit/delete an exercise in a day → `reorderProgramExercise`, `updateProgramExercise`, `deleteProgramExercise` |
| `add-exercise-dialog.tsx` | ✓ | Create a new catalog exercise → `createExercise` |
| `exercise-actions.tsx` | ✓ | Edit/delete a catalog exercise → `updateExercise`, `deleteExercise` (guarded) |

### Navigation & layout
| Component | Client | Role |
|-----------|:------:|------|
| `app-sidebar.tsx` | ✓ | Desktop sidebar nav with active state + "Start Workout" CTA (hidden on mobile via `useIsMobile`) |
| `bottom-nav.tsx` | ✓ | Mobile-only bottom nav; centered Dumbbell CTA to `/workout` |
| `app-header.tsx` | Server | Sticky header: logo (mobile), active-program label (desktop), theme toggle, resume/start button, sign-out. Reads active program + in-progress session |
| `page-header.tsx` | Server | Brutalist page header (eyebrow chip, title, subtitle, right-aligned action) |
| `block.tsx` | Server | Brutalist card container (inverted header bar, optional tag chip, offset shadow) — the dashboard's workhorse |

### Data visualization
| Component | Client | Role |
|-----------|:------:|------|
| `sparkline.tsx` | Server | Minimal inline trend line (no axes); SVG, marker on latest point |
| `line-chart.tsx` | ✓ | Interactive chart — hover crosshair/tooltip, axis labels, gridlines, area fill |
| `workout-calendar.tsx` | ✓ | Month grid with session status markers, tooltips, prev/next nav |

### Utilities & filters
| Component | Client | Role |
|-----------|:------:|------|
| `search-input.tsx` | ✓ | Search box syncing to the `q` query param (resets pagination) |
| `muscle-group-filter.tsx` | ✓ | Select syncing to the `muscle` query param |
| `pagination.tsx` | ✓ | Prev/next page nav via query param |
| `theme-toggle.tsx` | ✓ | Light/dark toggle (localStorage + DOM class) |
| `sign-out-button.tsx` | ✓ | Calls `signOut()` → `/sign-in` |

## `components/auth/`
- `auth-form.tsx` — **Client** — email sign-in/up form; calls `signIn.email()` / `signUp.email()` from the [auth client](auth.md); shows errors; redirects to `/` on success.

## `components/landing/`
- `kinetic-landing.tsx` — the public marketing page for signed-out visitors: hero with animated lift-name marquees, stats grid, three-step process, feature cards, FAQ, CTAs. Inline keyframes for the marquee. Rendered by `app/page.tsx` and `/` when there's no session.

## `components/ui/` (shadcn primitives)
`alert-dialog`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `table`, `tabs`, `tooltip`. Restyled to the brutalist theme via global CSS — see [Design System](design-system.md). Managed by shadcn (`components.json`).

## `hooks/use-mobile.ts`
`useIsMobile()` — boolean from a 768px media query; initializes `undefined` until mounted to avoid hydration mismatch.
