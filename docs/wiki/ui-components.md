# UI, Design System & Cross-cutting Components

GymTrack is a Next.js (App Router, RSC) app whose visual language is a **brutalist / "paper-and-ink"** aesthetic: hard 2px black borders, zero border-radius, offset drop shadows, uppercase display type, and a single acid-green **signal** accent. The UI layer is built on a shadcn/ui-style primitive set (`components/ui/`) that is then aggressively re-skinned by global CSS overrides. Cross-cutting shell components (`components/shared/`) compose those primitives into a role- and viewport-aware navigation shell.

This page documents the design system, theming, navigation shell, PWA plumbing, notifications, hooks, and the marketing landing page. For how these fit into the broader app, see [./architecture.md](./architecture.md); for the role model referenced throughout the nav, see [./auth-and-roles.md](./auth-and-roles.md).

---

## Design system

### shadcn/ui primitives

`components/ui/` holds a standard shadcn-style primitive set (each file is a thin wrapper over a Radix primitive or a plain `<div>`, styled with `cn()` and `data-slot` attributes):

| File | Primitive |
| --- | --- |
| `alert-dialog.tsx` | Radix AlertDialog |
| `badge.tsx` | styled `<span>` (cva variants) |
| `button.tsx` | cva button + `Slot.Root` (`asChild`) |
| `card.tsx` | Card / Header / Title / Description / Action / Content / Footer |
| `dialog.tsx` | Radix Dialog |
| `dropdown-menu.tsx` | Radix DropdownMenu |
| `input.tsx` | styled `<input>` |
| `label.tsx` | Radix Label |
| `scroll-area.tsx` | Radix ScrollArea |
| `select.tsx` | Radix Select |
| `separator.tsx` | Radix Separator |
| `sheet.tsx` | Radix Dialog (side drawer) |
| `sidebar.tsx` | full sidebar system (provider, inset, groups, menu) — ~21KB |
| `skeleton.tsx` | loading placeholder |
| `table.tsx` | table element set |
| `tabs.tsx` | Radix Tabs (cva `default`/`line` variants) |
| `tooltip.tsx` | Radix Tooltip |

The shared pattern (confirmed in `components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `tabs.tsx`):

- Function components (not `forwardRef`), each tagging its root with `data-slot="..."` (`button.tsx:58`, `card.tsx:12`) — these slots are the hook that global CSS overrides target (see Theming).
- Variants via `class-variance-authority` (`cva`) — e.g. `buttonVariants` with `variant` (default/outline/secondary/ghost/destructive/link) and `size` (default/xs/sm/lg + icon sizes) at `button.tsx:7-42`.
- `asChild` support via `radix-ui`'s `Slot.Root` (`button.tsx:54`).
- Radix imported from the unified `radix-ui` package (e.g. `import { Dialog as DialogPrimitive } from "radix-ui"`, `dialog.tsx:4`), not per-package `@radix-ui/*`.
- All class strings merged through `cn()`.

### `cn()` utility

`lib/utils.ts:4-6` — the canonical shadcn helper: `twMerge(clsx(inputs))`, combining conditional class composition (`clsx`) with Tailwind conflict resolution (`tailwind-merge`). Used by every primitive.

### `components.json`

`components.json` configures the shadcn CLI:

- `style: "radix-nova"`, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"` (`components.json:3,4,5,13`).
- `tailwind.cssVariables: true`, `baseColor: "neutral"` (`:9-10`).
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks` (`:15-21`).
- Note: `tailwind.css` points at `app/app/globals.css` (`:8`) but the real stylesheet lives at `app/globals.css` — the config path appears stale and does not affect the running app (Tailwind v4 is configured via CSS `@import`, not this file).

---

## Theming

Theming is driven entirely by CSS custom properties in `app/globals.css`, using Tailwind v4's CSS-first config (`@import "tailwindcss"` + `@theme inline`, `globals.css:1-54`).

- **Fonts** — mapped in `@theme inline` (`globals.css:10-13`): `--font-sans`/`--font-mono` = Space Mono; `--font-display`/`--font-heading` = Archivo Black. The two Google fonts are loaded in `app/layout.tsx:2-15` via `next/font/google` and exposed as `--font-archivo-black` / `--font-space-mono` on `<html>` (`layout.tsx:53`). Body defaults to mono; all `h1/h2/h3` get uppercase Archivo Black (`globals.css:149-155`).
- **Zero radius** — every `--radius-*` token is forced to `0px` (`globals.css:46-53`), enforcing hard corners.
- **Palette** — two token sets: `:root` = **light "paper"** (`globals.css:57-94`) and `.dark` = **dark "ink"** (`globals.css:97-133`), both in `oklch`. The accent is `--signal` (acid green, `oklch(0.9 0.22 124)`) with `--signal-foreground`. Also defines `card`, `popover`, `muted`, `destructive`, `chart-1..5`, and a full `sidebar-*` set.
- **Brutalist overrides** — `@layer components` (`globals.css:176-221`) re-skins the shadcn primitives *by `data-slot`*: cards get a 2px border + `4px 4px 0` offset shadow with gradients stripped (`:179-183`); buttons become uppercase/bold with 2px borders and a hover translate-shadow (`:190-204`); badges become mono tags; inputs/selects get 2px borders. This is why the primitives look nothing like default shadcn.
- **Extras** — custom scrollbars on fine pointers (`:163-173`), signal-colored `::selection` (`:157-160`), and keyframe animations `set-saved`, `pop`, `confetti-fall`/`.confetti-piece`, and `brutalist-rise`/`.reveal` (`:229-273`) used for set-save feedback, PR celebrations, and staggered reveals. `.safe-area-bottom` (`:223-226`) pads the mobile bottom-nav for the iOS home indicator.

### Light/dark toggle

- **Flash-free init**: an inline `themeScript` runs before paint in `app/layout.tsx` (`layout.tsx:17-18`, injected at `:56`). It reads `localStorage.theme`, falls back to `prefers-color-scheme`, and toggles `.dark` on `<html>`. `<html>` carries `suppressHydrationWarning` (`layout.tsx:52`).
- **Toggle control**: `components/shared/theme-toggle.tsx` — a client component. It reads current theme via `React.useSyncExternalStore` subscribed to a `MutationObserver` on `documentElement`'s `class` (`theme-toggle.tsx:6-20`), and on click flips the `.dark` class and persists to `localStorage` (`:22-28`). It renders a Sun/Moon icon button (`:38-42`). There is no `next-themes` dependency — theming is hand-rolled.

---

## Navigation shell

The signed-in shell is assembled in `app/(app)/layout.tsx`. It fetches the session, and for signed-out users renders children bare (`layout.tsx:18`). Otherwise it wraps everything in `TooltipProvider` + `SidebarProvider` (max-width 1440px with side borders) and lays out: a skip-to-content link (`:22-27`), the `AppSidebar`, a `SidebarInset` containing `AppHeader` + `<main>`, and the mobile `BottomNav` (`layout.tsx:28-49`). Role flags (`isAdmin`, `isTrainer`) are computed from the session and passed into sidebar and bottom-nav (`:31-32,45-46`).

### `NavSidebar` (shared shell) — `components/shared/nav-sidebar.tsx`

Reusable brutalist sidebar built on the `ui/sidebar` primitives. Key behaviors:

- **Hidden on mobile**: returns `null` when `useIsMobile()` is true (`nav-sidebar.tsx:54-56`) — mobile uses `BottomNav` instead.
- **Sectioned menu**: items carry an optional `section` label and are grouped in first-seen order (`:60-69`); items without a section fall under `navLabel` (default `"// Navigate"`).
- **Active state**: prefix match, or exact match when `item.exact` is set (`:72-74`) — used so section roots like `/` don't stay active on child routes.
- Renders brand block, numbered menu items (with `01`, `02` mono index badges), and an optional footer.

### `AppSidebar` — `components/shared/app-sidebar.tsx`

Client wrapper that supplies the app's nav model to `NavSidebar`. Base items are grouped under `// Train` (Dashboard, Log, Progress, Goals) and `// Build` (Programs, Exercises) (`app-sidebar.tsx:19-26`). Role-conditional items are appended: **Clients** (trainers, under Build), **Coach** (everyone except admins), **Admin** (admins only) (`:38-48`). Footer is a "Start Workout" CTA button (`:54-63`).

### `AppHeader` — `components/shared/app-header.tsx`

Async server component (sticky top bar). Fetches session, active program, in-progress session, and unread notification count in parallel (`app-header.tsx:15-20`). Contents:

- An **impersonation banner** when an admin is impersonating (`:36-51`) — see roles docs.
- Mobile-only logo; desktop "Active program" chip (`:54-82`).
- Right cluster (`:84-151`): role-gated mobile icon links (Clients/Coach/Admin), a **Notifications bell with unread badge** (`:111-126`, badge caps at `9+`), the `ThemeToggle`, a context-aware primary action (**Resume** if a session is in progress → **Start {dayCode}** if today has a scheduled day → **Workout** fallback, `:128-149`), and `SignOutButton`.

### `BottomNav` — `components/shared/bottom-nav.tsx`

Mobile-only (`md:hidden`, fixed bottom, `bottom-nav.tsx:63`). A five-slot bar: Home, Log, a primary **Start** tile (inverted colors), Progress, and a **More** slot (`:30-35`) that opens a `Sheet` bottom drawer (`:106-146`) containing the "Build" destinations (Goals, Programs, Exercises + role-gated Clients/Coach/Admin, `:49-56`). The More tab highlights when the current path matches any `BUILD_PREFIXES` route (`:38,58-60`).

### `Breadcrumbs` — `components/shared/breadcrumbs.tsx`

Takes a `Crumb[]` (`label` + optional `href`). Renders an uppercase, tracked trail with `ChevronRight` separators; the last item is bold, non-linked, and marked `aria-current="page"` (`breadcrumbs.tsx:18-38`).

### `PageHeader` — `components/shared/page-header.tsx`

Standard page title block: optional signal-colored `eyebrow` chip, big display `title` over a hard 2px bottom rule, optional `subtitle`, and a right-aligned `action` slot (`page-header.tsx:18-34`). Used e.g. on the notifications page.

**Per-role / per-viewport summary**: role flags flow from the layout into `AppSidebar` and `BottomNav`, which each independently add Clients/Coach/Admin entries. The desktop **sidebar** (`md+`) and the mobile **bottom-nav + More sheet** are mutually exclusive by viewport (`useIsMobile` / `md:hidden`), so the same destinations are reachable in both form factors.

---

## PWA

- **Manifest** — `app/manifest.ts` (Next.js `MetadataRoute.Manifest`): name "GymTrack", `display: "standalone"`, `#171717` theme/background, and a single `/icon.svg` used for both `any` and `maskable` purposes (`manifest.ts:3-27`). Installable as a standalone app.
- **Wake lock** — `components/shared/wake-lock.tsx`: a client component rendering `null`. On mount it requests a screen wake lock via the `navigator.wakeLock` API (guarded for support and failures) and re-acquires it on `visibilitychange` back to visible, releasing on unmount (`wake-lock.tsx:5-35`). Mounted during active workouts to keep the phone screen on between sets.

---

## Notifications

A lightweight in-app notification system (no push): DB table + data helpers + one action + one page.

- **Schema** — `db/schema.ts:166-180`, table `notifications`: `userId` (recipient), `type` (e.g. `coach_note`, `program_assigned`, `client_joined`, `client_left`, `workout_logged`), `title`, optional `body`, optional `linkPath`, `readAt` (null = unread), `createdAt`.
- **Data helpers** — `data/notifications.ts`: `createNotification()` inserts a row (an internal helper, not user-triggered — `:14-28`); `getDisplayName()` resolves a user id to a name with fallback (`:31-41`); `getMyNotifications(limit=30)` returns the current user's rows newest-first (`:44-52`); `getMyUnreadCount()` powers the header badge (`:55-62`). All scoped to `requireUserId()`.
- **Producers** — `createNotification` is called from `app/actions/sessions.ts`, `app/actions/trainer.ts`, and within `data/notifications.ts` (coach notes, program assignments, client join/leave, logged workouts).
- **Action** — `app/actions/notifications.ts`: `markAllNotificationsRead()` sets `readAt` on all of the user's unread rows and revalidates `/notifications` + the root layout so the header badge clears (`notifications.ts:10-19`).
- **Page** — `app/(app)/notifications/page.tsx`: async server component listing up to 50 notifications under a `PageHeader` with a "Mark all read" form action shown only when unread exist (`page.tsx:19-36`). Empty state shows a Bell placeholder; unread rows get a signal dot + tinted border; rows with a `linkPath` wrap in a `<Link>` (`:38-92`).

---

## Hooks & utilities

### `hooks/`

- **`use-mobile.ts`** — `useIsMobile()`: subscribes to a `(max-width: 767px)` media query (breakpoint 768) via `React.useSyncExternalStore` (`use-mobile.ts:3-18`). Returns `false` on the server. Used by `NavSidebar` to unmount itself on mobile. This is the only file in `hooks/`.

### `lib/format.ts`

Display formatters:
- `formatDate(dateStr)` — parses a `YYYY-MM-DD` string as a **local** date (avoiding timezone shift) and returns relative labels: "Today"/"Yesterday", weekday name (<7 days), "Jun 16" (same year), or "Jun 16, 2024" otherwise (`format.ts:2-34`).
- `formatStatus(status)` — maps session status to display text (`completed` → "Completed", `in_progress` → "In progress", `format.ts:37-46`).

### `lib/utils.ts`

- `cn()` — the Tailwind class merge helper described under Design system (`utils.ts:4-6`).

(Other `lib/` modules — `auth.ts`, `muscles.ts`, `progression.ts`, `validation.ts`, etc. — are outside this UI topic; see [./architecture.md](./architecture.md).)

---

## Landing page

`components/landing/kinetic-landing.tsx` — the signed-out marketing page (a single client-free presentational component built from static content arrays). It leans hard into the brutalist kinetic aesthetic:

- **Scrolling marquees**: a `Marquee` sub-component (`kinetic-landing.tsx:78-109`) renders a seamless, infinitely-scrolling band of lift names, duplicated for looping, with `ink`/`signal` skins and a `reverse` direction. Animation is defined inline via a `<style>` block and disabled under `prefers-reduced-motion` (`:114-121`).
- **Sections**: sticky-free header with Sign in, a hero with the signal-highlighted "Make the numbers move." headline, two counter-rotated marquee bands, a bordered stats strip, a "Three moves" (Build/Log/Progress) grid, a four-feature grid, a "Built for the gym floor" checklist (rest timer, wake-lock, resume, RIR, etc.), a CTA marquee, an FAQ `<dl>`, and a final CTA (`:123-306`).
- Uses `.reveal` staggered-rise animation (from globals.css) on hero elements, offset shadows in the signal color, and `var(--font-display)` for oversized headings.

---

## Key files

| File | Purpose |
| --- | --- |
| `components/ui/` (18 files) | shadcn/ui-style primitives (button, card, dialog, sheet, sidebar, table, tabs, select, dropdown-menu, tooltip, …) |
| `components.json` | shadcn CLI config (style `radix-nova`, lucide, aliases) |
| `lib/utils.ts` | `cn()` class-merge helper |
| `app/globals.css` | Tailwind v4 theme, oklch light/dark tokens, brutalist `data-slot` overrides, keyframes |
| `app/layout.tsx` | root layout: fonts, flash-free theme init script |
| `components/shared/theme-toggle.tsx` | hand-rolled light/dark toggle (`MutationObserver` + localStorage) |
| `app/(app)/layout.tsx` | signed-in shell (sidebar + header + inset + bottom-nav) |
| `components/shared/nav-sidebar.tsx` | reusable brutalist sidebar shell (hidden on mobile) |
| `components/shared/app-sidebar.tsx` | app nav model + role-gated items |
| `components/shared/app-header.tsx` | sticky header: program chip, notifications, theme, contextual CTA |
| `components/shared/bottom-nav.tsx` | mobile bottom nav + "More" sheet |
| `components/shared/breadcrumbs.tsx` | breadcrumb trail |
| `components/shared/page-header.tsx` | standard page title block |
| `hooks/use-mobile.ts` | `useIsMobile()` media-query hook |
| `lib/format.ts` | date/status display formatters |
| `app/manifest.ts` | PWA manifest |
| `components/shared/wake-lock.tsx` | screen wake-lock during workouts |
| `data/notifications.ts` | notification data helpers |
| `app/actions/notifications.ts` | `markAllNotificationsRead` action |
| `app/(app)/notifications/page.tsx` | notifications list page |
| `components/landing/kinetic-landing.tsx` | marketing landing page |

---

## Related pages

- [./architecture.md](./architecture.md) — overall app structure, data layer, RSC/action boundaries.
- [./auth-and-roles.md](./auth-and-roles.md) — the user/trainer/admin role model that drives per-role navigation and the impersonation banner.
