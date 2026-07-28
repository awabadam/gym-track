# Design Fixes Tracker

A living checklist for closing out the [2026-07-28 design audit](design-audit-2026-07-28.md). Every finding, grouped into ordered work phases. Fix top-down; each item carries its `file:line` and the concrete change.

**Status legend:** ☐ todo · ◐ in progress · ☑ done

**Scope:** Everything (all P1/P2/P3). **Mode:** plan approved, implementation not started.

---

## Phase 1 — P1: Mobile ergonomics & the write path

The app's whole reason to exist is logging a set one-handed between sets. These break that scene.

### 1.1 Touch targets to ≥44px (systemic)
Root cause is the button size scale; the pattern is copied into the hand-built controls.

- ☐ `components/ui/button.tsx:24-28` — every size is sub-44 (`default` 32px, `sm` 28px, `lg` 36px, `icon`/`icon-sm` 28-32px). Raise interactive sizes to ≥44px on touch (or add a `min-h-11` touch variant).
- ☐ `components/shared/set-logger.tsx:88,150,164` — weight/reps inputs + RIR button + confirm check all `h-9` (36px). Raise row to `h-11`; widen check to `w-11`.
- ☐ `components/shared/rest-timer.tsx:104,128-201` — controls `h-7` (28px). Raise to ≥44px.
- ☐ `components/shared/app-header.tsx:88,98,105,115` — icon buttons `h-8 w-8` (32px), the mobile-only entry points. Bump to `size-11`.
- ☐ `components/shared/user-row-actions.tsx:112-119` — 32px trigger + ~32px menu rows. Enlarge on touch.
- ☐ `components/shared/program-week-builder.tsx:491-533` — up/down/delete controls `h-8 w-8` at `gap-0.5`. Enlarge + widen spacing.
- ☐ `components/shared/pagination.tsx` — prev/next `h-8 w-8`. Enlarge.

### 1.2 The core write path must fail loudly
- ☐ `components/shared/set-logger.tsx:71-86` — optimistic save reverts silently on `catch`. Surface an inline error/toast, keep entered values, offer retry.
- ☐ `components/shared/rest-timer.tsx:14-40` — client `setInterval` loses state on refresh and drifts/pauses when backgrounded. Anchor to a stored `Date.now()` target; recompute on tick + `visibilitychange`; persist to localStorage.
- ☐ `components/shared/rest-timer.tsx:44,106,115-119` — rest-over is color-only + `hidden sm:inline` label + no sound/vibration. Fire `navigator.vibrate()` + optional beep; show the label on mobile (also fixes SC 1.4.1).

### 1.3 Charts legible & accessible
- ☐ `components/shared/line-chart.tsx:129,133-137` — trend line + fill in `--signal` on paper ≈1.3:1 (fails WCAG 1.4.11). Stroke the line in `--foreground` (or `--chart-2`); reserve `--signal` for fill/endpoint.
- ☐ `components/shared/sparkline.tsx:50-57` — same failure; this is the Progress "Trend" column + Strength 1RM history. Line in `--foreground`, `--signal` endpoint only.
- ☐ `components/shared/strength-section.tsx:197` — "Achieved" label `text-signal` on card ≈1.3:1. Use `--foreground`, `--signal` only as a bordered chip.
- ☐ `components/shared/line-chart.tsx:90-98,95` — no `role="img"`/`<title>`/`<desc>`/aria-label; tooltip is `onMouseMove` only (no touch/keyboard). Add `role="img"` + summary label + visually-hidden data table + `onPointerDown`/focusable points.
- ☐ Wire the unused `--chart-1..5` tokens (`app/globals.css:79-83,119-123`) into the chart components.

### 1.4 Brutalist system reaches overlays & working surfaces
- ☐ `components/ui/dialog.tsx:64`, `alert-dialog.tsx:61` — only `ring-1 ring-foreground/10`. Add `border:2px solid var(--foreground)` + `box-shadow:4px 4px 0 0 var(--shadow-color)` via a `[data-slot]` override.
- ☐ `components/ui/sheet.tsx:65`, `select.tsx:72`, `dropdown-menu.tsx:46,247`, `tabs.tsx:66-68` — leak default `shadow-lg/md/sm`. Extend the override block; strip soft shadows.
- ☐ `components/shared/session-detail.tsx:112,165,206`, `app/(app)/log/page.tsx:78`, `log/[sessionId]` — shadcn `Card`/`Badge`/`Separator` with `rounded-*` + `text-2xl font-bold` sans title. Apply `Block`/brutalist treatment + display font; kill radius.
- ☐ `components/shared/trainer-application-form.tsx:34` — raw shadcn textarea (rounded, 1px border). Match `coach-note-form.tsx:41`: `border-2 border-foreground`, no radius.

---

## Phase 2 — P1/P2: Error prevention, feedback & consistency

### 2.1 Confirmation friction (inverted by risk)
- ☐ `components/shared/user-row-actions.tsx:122-135` — Promote-to-admin & Impersonate fire on single `onSelect`, no confirm. Wrap both in AlertDialog naming user + consequence.
- ☐ `components/shared/coach-notes-list.tsx:57-68` — bare `<form>` one-tap permanent delete. Add confirm or undo toast.

### 2.2 Error handling on write actions
- ☐ `app/(app)/programs/new/page.tsx:21` — `<form action={createProgram}>` has no try/catch; a rejected create throws to the error boundary. Wrap in a client handler with inline `text-destructive`, or `useActionState`.
- ☐ `components/shared/add-exercise-dialog.tsx:30-33` — `handleSubmit` has no try/catch; failure leaves the dialog open with no feedback. Mirror `ExerciseActions.handleDelete`.
- ☐ `components/shared/exercise-actions.tsx:55-58` — `handleUpdate` has no try/catch (sibling delete does). Add it.
- ☐ `components/shared/program-week-builder.tsx:551-569` — no `repRangeMin ≤ repRangeMax` guard; invalid range only fails server-side. Validate client-side with inline message.
- ☐ `app/(app)/exercises/page.tsx:57-71` — out-of-range `?page=` renders empty table reading "page 999 of 65". Clamp `page` to `totalPages` or show no-results card.

### 2.3 Pending / success states on forms
- ☐ `components/shared/assign-program-form.tsx:60`, `join-trainer-form.tsx:41`, `trainer-application-form.tsx:38` — no pending/disabled state. Add `useTransition` + disabled + "Saving…" (as `auth-form`/`coach-note-form` do).
- ☐ `components/shared/session-detail.tsx:287-292` (Finish), `app/(app)/page.tsx:297-309` (Start) — plain submits, double-tap risk. Add pending/disabled.
- ☐ `app/(app)/programs/page.tsx:67-84` — "Set active"/"Duplicate" bare submits, no pending or confirmation toast. Add both.

### 2.4 Control consistency
- ☐ Native `<select>` → shadcn `Select` (sub-44 + no focus ring): `programs/new/page.tsx:41-52`, `program-week-builder.tsx:217-228`, `muscle-select.tsx:35-52`, `assign-program-form.tsx:45-57`.
- ☐ Detail/new/edit H1s bypass `PageHeader` (`text-2xl font-bold`): `programs/new:14`, `programs/[slug]:36`, `programs/[slug]/edit:53`, `exercises/[id]:70`. Route through `PageHeader`.
- ☐ `components/shared/session-detail.tsx:227` — off-palette `yellow-500` PR badge. Use `--signal`.
- ☐ `program-week-builder.tsx` (edit) — mixed save models: details need explicit Save, everything else auto-commits. Pick one model or label the details block.

---

## Phase 3 — P2: Accessibility & responsive

- ☐ Skip-link missing in 2 of 3 consoles: `app/(trainer)/layout.tsx:57-62`, `app/(admin)/layout.tsx:62-67`. Hoist the anchor from `app/(app)/layout.tsx:22-27` into a shared shell.
- ☐ Focus-visible ring missing on core nav: `components/shared/theme-toggle.tsx:31-37`, `bottom-nav.tsx:88-117`, `nav-sidebar.tsx:77-87`. Add `focus-visible:outline-2 outline-offset-2 outline-foreground`.
- ☐ Flat heading semantics: titles as `<span style=font-display>` (`block.tsx:31`, `nav-sidebar.tsx:103`, `app-header.tsx:61-66`) + `globals.css:149` styles h1/h2/h3 identically. Use real headings + differentiate scale.
- ☐ Auth inline validation: `components/auth/auth-form.tsx:85-102` — surface the 8-char rule as a hint, add per-field errors + `aria-invalid`; generic "Something went wrong" doesn't name the problem.
- ☐ `components/shared/set-logger.tsx:102-105` — "previous set" reference `hidden sm:inline`. Show a compact value on mobile.
- ☐ `components/shared/rest-timer.tsx:160-174` — duration presets `hidden sm:flex`; mobile can't change rest length. Expose presets/stepper on mobile.
- ☐ `components/shared/session-detail.tsx:186` — progression guidance `text-muted-foreground/80`; drop the `/80`, bump size.
- ☐ `components/shared/workout-calendar.tsx:159` — day-cell `<Link>` announces bare number. Add `aria-label` ("Mar 15 — Push day, completed").
- ☐ `components/shared/muscle-volume-map.tsx:10-30,53-67,135-139` — hardcoded hex ramp, no dark mode, color-only meaning, unlabeled SVGs. Derive ramp from `--signal`/`--chart-*` via `color-mix`; widen tier lightness steps (≥3:1); add `aria-label` or `aria-hidden`+legend.
- ☐ `components/shared/line-chart.tsx:91-94` — `preserveAspectRatio="none"` distorts markers/text on mobile. Switch to `xMidYMid meet` (fixes tooltip drift at `:199-201` too).
- ☐ `components/shared/muscle-select.tsx:60-79` — supporting muscles = flat wall of ~25 sub-44 chips. Group by `MUSCLES_BY_REGION`, enlarge, consider collapse.

---

## Phase 4 — P3: Polish, edges & catalog scale

- ☐ `components/ui/scroll-area.tsx:49` — thumb `rounded-full` survives the zero-radius override. Set `rounded-none`.
- ☐ `components/ui/tooltip.tsx:51` — arrow `rounded-[2px]` radius leak. `rounded-none`.
- ☐ `components/ui/badge.tsx:8,18` — outline variant 1px border while everything else is 2px. Promote to 2px in the override.
- ☐ Modal scrim `bg-black/10` theme-blind (`dialog.tsx:42`, `sheet.tsx:40`, `alert-dialog.tsx:39`) — nearly invisible in dark mode. Use a theme-aware scrim.
- ☐ `components/ui/button.tsx:19-20` — destructive `text-destructive` on `bg-destructive/10` ≈4:1. Darken text token or raise bg opacity.
- ☐ Shadow drift 5px vs 4px: `components/landing/kinetic-landing.tsx:228,296`, `app/(app)/page.tsx:185`. Standardize on 4px (promote a shadow token).
- ☐ `app/(app)/programs/[slug]/edit/page.tsx:93` — program-delete `AlertDialogAction` not `bg-destructive` while exercise-delete is. Mark it destructive.
- ☐ `components/shared/program-week-builder.tsx:367-393` — `DayLabelEditor` input has no Enter-to-save/Esc-cancel. Add `onKeyDown`.
- ☐ `components/shared/set-logger.tsx:142-156` — RIR cycles up-only; overshoot wraps through 0. Add long-press-decrement or stepper.
- ☐ `components/shared/set-logger.tsx:66-69` — editing a saved set un-fills the check but leaves the old DB row until re-confirmed (UI/DB mismatch on return). Reconcile.
- ☐ `components/shared/set-logger.tsx:152` — RIR label `text-[9px]`; `:103` `text-[11px]` — floor micro-labels at ~11-12px; verify contrast on the `bg-signal/15` tinted row.
- ☐ `components/shared/achievements-showcase.tsx:20` — returns `null` with no achievements; first-run users get no orientation. Render a lightweight empty prompt.
- ☐ `app/(app)/exercises/[id]/page.tsx:78` — secondary-muscle badges `opacity-70` likely sub-4.5:1. Use a muted token instead of opacity.
- ☐ `components/shared/line-chart.tsx:28` — empty state `border-dashed`; app language is solid 2px `--foreground`. Match it.
- ☐ `components/shared/muscle-volume-map.tsx:149` — legend swatches 1px border. `border-2`.
- ☐ `components/auth/auth-form.tsx:104-121` — no forgot-password link (locked-out dead end); loading is text-only. Add link + spinner.
- ☐ `components/shared/trainer-sidebar.tsx:7-9` + trainer layout — single "01 Clients" numbered item looks unfinished; no mobile section nav (unlike admin's `AdminNav`). Drop numbering or consolidate; add mobile parity.
- ☐ `app/(admin)/admin/page.tsx:83-181` — Users table has no row selection / bulk actions. Add checkbox selection + bulk action bar.

---

## Catalog-scale performance (P2, cross-cutting)

- ☐ `app/(app)/programs/[slug]/edit/page.tsx:35` + `program-week-builder.tsx:609-617` — `getAllExercises()` ships the full ~1300-item catalog to the client for local filtering. Back the picker with a server search action (as the Exercises index does).
- ☐ `program-week-builder.tsx:622-651` — exercise picker shows up to 8 results (Miller's ≤4), no no-results state, no `combobox`/`listbox` roles or `aria-live` count. Cap ~5, add "No exercises match", add roles + live region.
- ☐ `components/shared/pagination.tsx` — at ~65 pages, only prev/next. Add first/last or page-jump; consider larger page size.

---

## Verified working (do not regress)

Detector clean · landing is design-specific with proper h1/landmarks + `prefers-reduced-motion` · admin/trainer tables have mobile card fallbacks (no overflow) · auth preserves form state on error with `role="alert"` · correct `inputMode`/autocomplete on inputs · self-hosted fonts, pre-paint theme script · radius globally neutralized via `@theme` (only literal `rounded-full`/`rounded-[2px]` leak) · icon buttons carry `aria-label`.
