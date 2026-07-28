# Design Fixes — SDD Execution Plan

Execution plan for the [2026-07-28 design audit](../../design-audit-2026-07-28.md). Human-readable checklist: [design-fixes-tracker.md](../../design-fixes-tracker.md). Tasks are ordered so foundational primitives (button sizing, global overlay overrides) land before the components that inherit them.

## Global Constraints

Bind every task. Copy verbatim into each task reviewer's constraints block.

- **This is a REFINEMENT, not a redesign.** Preserve all existing behavior, copy, data flow, and route structure. Only change what a task names. Do not restyle surfaces a task does not mention.
- **Committed brutalist brief** (the design system — conform to it, never soften it):
  - Zero border-radius everywhere. Radius tokens are already `0px` via `@theme` in `app/globals.css`; never introduce `rounded-*` except `rounded-none`. Literal `rounded-full`/`rounded-[Npx]` must become `rounded-none`.
  - Hard borders: `2px solid var(--foreground)` (Tailwind `border-2 border-foreground`). Never 1px on cards/inputs/controls.
  - Offset drop-shadow: `4px 4px 0 0 var(--shadow-color)` (NOT 5px, NOT soft `shadow-md/lg`).
  - Type: Archivo Black display (`var(--font-display)`, uppercase) for headings; Space Mono (`var(--font-sans)`/`--font-mono`) for body/data. Real numbers are `tabular-nums`.
  - Color: near-black/near-white with a SINGLE chartreuse accent `--signal`. No second accent color (no `yellow-500`, no raw hex ramps). Both light ("paper") and dark ("ink") themes must work — verify any color in both.
- **Accessibility floor:** interactive touch targets ≥44×44px; visible `focus-visible` indicator on every interactive element; body/placeholder text contrast ≥4.5:1, large text and graphical objects ≥3:1 in BOTH themes; icon-only controls carry `aria-label`; meaning never by color alone.
- **Tokens over literals:** use CSS variables / Tailwind token classes, never hard-coded hex/rgb. The `--chart-1..5` tokens exist for chart use.
- **Verification protocol** (there is no meaningful unit-test surface for most of these visual changes; verify this way instead):
  1. `npx tsc --noEmit` — zero errors.
  2. `npm run lint` — zero new warnings/errors.
  3. For any changed route/component, boot `npm run dev` (background) and `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/<route>` returns 200 — the page still compiles and renders. Stop the server after.
  4. Where a Vitest test already covers touched logic, run it. Do NOT invent tests for pure styling changes.
- **Commit** each task on the `design-fixes` branch with a clear message; end messages with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.
- **Deferred (do NOT implement):** password-reset / "Forgot password?" flow — blocked on an email provider per `docs/production-readiness-plan.md`. The loading-spinner half of that item IS in scope.

---

## Task 1 — Button primitive: 44px touch sizes + destructive contrast

**File:** `components/ui/button.tsx`.

The size scale is the root cause of sub-44px targets across the app. Current sizes (lines ~24-28): `default` h-8 (32px), `sm` h-7 (28px), `lg` h-9 (36px), `icon`/`icon-sm` 28-32px.

- Raise touch heights so real interactive buttons are ≥44px: `default` → `h-11` (44px), `lg` → `h-12`, `icon` → `size-11`. Keep `sm`/`icon-sm` for genuinely dense desktop-only contexts but bring them to a defensible floor (`h-9`/`size-9`, 36px) since they render inside 44px rows. Preserve horizontal padding proportions and the uppercase/bold `[data-slot=button]` treatment.
- Destructive variant (lines ~19-20): `text-destructive` on `bg-destructive/10` is ~4:1 for small text. Raise the tint (`bg-destructive/15`) or darken the text token usage so label contrast clears 4.5:1 in both themes.

**Acceptance:** every non-`sm` button renders ≥44px tall; destructive label ≥4.5:1 in light and dark; no layout breakage on pages using buttons (spot-check `/sign-in`).

---

## Task 2 — Brutalist coverage for overlays (globals.css)

**File:** `app/globals.css` — extend the `@layer components` `[data-slot]` override block (currently only card/button/input/select-trigger/textarea/badge).

The brutalist language never reaches the overlay layer; these are generic shadcn. Add overrides so each gets the 2px foreground border + 4px offset shadow and loses soft/rounded defaults:

- `[data-slot="dialog-content"]`, `[data-slot="alert-dialog-content"]`, `[data-slot="sheet-content"]`, `[data-slot="popover-content"]`, `[data-slot="select-content"]`, `[data-slot="dropdown-menu-content"]`, `[data-slot="dropdown-menu-sub-content"]` → `border: 2px solid var(--foreground) !important; box-shadow: 4px 4px 0 0 var(--shadow-color) !important;` and strip any soft `box-shadow`.
- `[data-slot="badge"]` outline usages and `[data-slot="tabs-trigger"]` active state: ensure 2px border / no soft `shadow-sm`.
- **Overlay scrim:** the `bg-black/10` scrim in `dialog.tsx:42`, `sheet.tsx:40`, `alert-dialog.tsx:39` is near-invisible in dark mode. Replace with a theme-aware scrim — edit those three files to use `bg-foreground/40` (inverts per theme) or a dedicated token, so the dim reads in both themes.
- **Radius leaks** the `@theme` zero-radius does not catch (literal classes): `components/ui/scroll-area.tsx:49` thumb `rounded-full` → `rounded-none`; `components/ui/tooltip.tsx:51` arrow `rounded-[2px]` → `rounded-none`; `components/ui/badge.tsx` outline variant border → `border-2`.

**Acceptance:** open (via dev server render) a dialog, select, and dropdown — each shows hard 2px border + offset shadow, no rounding; scrim visible in dark mode; `grep -rn "rounded-full\|rounded-\[" components/ui` returns only intcentional/none.

---

## Task 3 — Set-logger: write-path resilience + mobile ergonomics

**File:** `components/shared/set-logger.tsx`.

- **Touch size:** the row controls are `h-9` (36px) — weight/reps inputs, RIR button, confirm check (`w-9 h-9`). Raise interactive controls to `h-11` (44px); confirm check to `w-11 h-11`. Keep hard 2px borders.
- **Loud save failure (critical):** `handleSave` (lines ~71-86) optimistically sets `saved`, then on `catch` silently reverts. Add visible error state: on catch, set an `error` flag, keep the entered weight/reps, show an inline error affordance (e.g. the check turns to a destructive retry state / small `role="alert"` text) and let the user re-tap to retry. Never lose the typed values.
- **Previous-set on mobile:** the previous-set reference (`hidden ... sm:inline`, lines ~102-105) is the progressive-overload cue. Show a compact form on mobile (e.g. as the input placeholder or a small line under the row) so it's visible on phones.
- **Micro-labels:** RIR label `text-[9px]` (line ~152) and previous `text-[11px]` — floor at `text-[11px]`/`text-xs`; verify contrast on the `bg-signal/15` saved row (use `--foreground`, not gray, on the tint).
- **RIR decrement:** RIR only cycles up `(rir+1)%6` (lines ~142-156); add a way to go down (long-press or a tiny stepper) so overshoot doesn't require wrapping 0→5.
- **Edit-reconfirm reconcile:** editing a saved set un-fills the check (`markDirty`) but leaves the old DB row until re-confirmed (lines ~66-69). At minimum make this unambiguous in the UI (e.g. label the un-confirmed state), or delete/rewrite on edit; do not silently keep a stale value while showing "unsaved".

**Acceptance:** controls ≥44px; forcing `logSet` to reject shows a visible error and preserves inputs; previous value visible at 360px; no `text-[9px]`; RIR reachable both directions.

---

## Task 4 — Rest-timer: robustness + mobile feedback

**File:** `components/shared/rest-timer.tsx`.

- **Timestamp anchor (critical):** the timer is client `setInterval` state (lines ~14-40) — it resets on refresh and drifts/pauses when the tab is backgrounded or the screen locks. Rework to store a target end-timestamp (localStorage) and compute remaining from `Date.now()` on each tick AND on `visibilitychange`, so it survives refresh and stays accurate after backgrounding.
- **Finish signal on mobile:** at 0 the only cue is a red number + `animate-pulse`; the "Rest over" label is `hidden sm:inline` and there is no sound/vibration (lines ~44,106,115-119). Fire `navigator.vibrate([...])` and an optional short beep (WebAudio) on finish, and show the label on mobile (fixes color-only SC 1.4.1).
- **Mobile presets:** duration presets (`1:30 / 2:00 / 3:00`) are `hidden sm:flex` (lines ~160-174) — mobile can't change rest length. Expose them (or a compact stepper) on mobile.
- **Touch size:** controls are `h-7` (28px, lines ~104,128-201) — raise to ≥44px.

**Acceptance:** start a rest, refresh → countdown resumes from correct remaining; background the tab for 30s → remaining is correct on return; finish fires vibration + visible mobile label; presets tappable at 360px; controls ≥44px.

---

## Task 5 — Header + nav: touch targets, focus, heading semantics

**Files:** `components/shared/app-header.tsx`, `bottom-nav.tsx`, `nav-sidebar.tsx`, `theme-toggle.tsx`, `block.tsx`, plus the `h1,h2,h3` rule in `app/globals.css:149`.

- **Header touch:** icon buttons `h-8 w-8` (app-header.tsx ~88,98,105,115) are the mobile-only entry points → `size-11` (44px). Keep existing `aria-label`s.
- **Focus visibility:** bottom-nav Links (~88-117), nav-sidebar Links (~77-87), theme-toggle button (~31-37) define only hover — no visible keyboard focus. Add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground` (or the shadcn ring pattern) to each.
- **Heading semantics:** prominent titles render as `<span style=font-display>` (block.tsx:31, nav-sidebar.tsx:103, app-header.tsx:61-66) so the SR outline is flat, and `globals.css:149` styles `h1,h2,h3` identically. Convert these span-titles to real heading elements at the correct level, and differentiate the display scale between h1/h2/h3 (e.g. distinct `text-*` sizes) so hierarchy is both semantic and visual. Do not change the visual weight of body copy.

**Acceptance:** header icon buttons ≥44px; keyboard-tabbing the bottom nav / sidebar / theme toggle shows a visible focus ring in both themes; `Block` and header titles are real headings; h1≠h2≠h3 in rendered size.

---

## Task 6 — Charts: legibility + accessibility

**Files:** `components/shared/line-chart.tsx`, `sparkline.tsx`, `strength-section.tsx`.

- **Light-mode invisible line (critical):** line-chart trend stroke + fill (~129,133-137) and sparkline stroke (~50-57) use `--signal` (oklch 0.9) on the paper background (oklch 0.985) ≈ 1.3:1. Stroke the LINE in `--foreground` (or `--chart-2`); reserve `--signal` for the fill/area and the endpoint marker only. Verify ≥3:1 vs `--background` in both themes.
- **"Achieved" label:** `strength-section.tsx:197` `text-signal` on card ≈1.3:1 in light → use `--foreground` text, or `--signal` only as a bordered chip with `--signal-foreground` text.
- **Chart tokens:** wire the unused `--chart-1..5` tokens (`globals.css:79-83,119-123`) into the chart components instead of ad-hoc `--signal`.
- **SVG a11y:** line-chart SVG (~90-98) has no `role="img"`/`<title>`/`<desc>`/aria-label and the tooltip is `onMouseMove`-only (no touch/keyboard). Add `role="img"` + a summarizing `aria-label`/`<title>`, expose the series via a visually-hidden `<table>` or `<desc>`, and add `onPointerDown` (touch) + focusable point access to the tooltip.
- **No distortion:** `preserveAspectRatio="none"` (~91-94) squishes markers and axis text on mobile → `xMidYMid meet` (also fixes tooltip drift at ~199-201; recompute tooltip position from the rendered point).
- **Empty state:** line-chart empty state `border-dashed` (~28) → solid `border-2 border-foreground` to match the system.

**Acceptance:** trend line visible in light mode (≥3:1); a screen reader gets a chart summary + data alternative; markers render square at 360px; tooltip reachable by touch.

---

## Task 7 — Muscle-volume map: tokens, dark mode, a11y

**File:** `components/shared/muscle-volume-map.tsx`.

- **Token ramp (no raw hex):** the 6-step lime ramp (`#ecfccb`…`#65a30d`), `HIGHLIGHT_PAIR`, and `UNWORKED="#d4d4d4"` (lines ~10-30) are raw hex — they violate the single-`--signal` rule and don't adapt to dark ("ink") mode (fixed light greens on a dark card). Derive the ramp from `--signal`/`--muted` via `color-mix` (or per-theme CSS-var tiers) so it responds to theme.
- **Tier contrast:** the two lowest tiers are near-identical to each other, to the background, and to unworked (~135-139). Widen tier lightness steps so each tier is ≥3:1 vs the background and vs the unworked state, so a lightly-trained muscle is distinguishable from an untrained one.
- **SVG a11y:** the two `<Model>` body SVGs (~53-67) have no `aria-label`/role. Add an `aria-label` summarizing top-trained muscles (or `aria-hidden` on the figures + ensure the legend `<ul>` is the accessible source). Meaning must not be color-only.
- **Legend border:** swatches use 1px `border` (~149) → `border-2`.

**Acceptance:** map renders correct tiers in BOTH themes (no light-green-on-dark); tiers visually distinct; SR gets a meaningful summary; legend swatches 2px.

---

## Task 8 — Detail-page consistency (brutalist headings + surfaces)

**Files:** `app/(app)/programs/new/page.tsx`, `programs/[slug]/page.tsx`, `programs/[slug]/edit/page.tsx`, `exercises/[id]/page.tsx`, `components/shared/session-detail.tsx`, `app/(app)/log/page.tsx`, `log/[sessionId]/page.tsx`, `components/shared/trainer-application-form.tsx`, `page-header.tsx` (reference).

- **PageHeader everywhere:** the detail/new/edit H1s use `text-2xl font-bold` (programs/new:14, programs/[slug]:36, edit:53, exercises/[id]:70) instead of `PageHeader` (Archivo Black display, uppercase, `border-b-2`). Route all four through `PageHeader` so the section matches its own index pages.
- **Workout/log surfaces:** `session-detail.tsx` (~112,165,206) and `log/page.tsx:78` fall back to shadcn `Card`/`Badge`/`Separator` with `rounded-*` + plain `text-2xl font-bold` sans titles. Apply the `Block`/brutalist treatment and display font to session headers/rows; remove radius. These are the two most-used screens — they must match the dashboard.
- **PR badge:** `session-detail.tsx:227` off-palette `yellow-500` PR badge → `--signal`.
- **Progression guidance contrast:** `session-detail.tsx:186` `text-muted-foreground/80` — drop the `/80`, bump size; this is the only coaching line on the screen.
- **Trainer-application textarea:** `trainer-application-form.tsx:34` is raw shadcn (`rounded-lg border border-input`) → match `coach-note-form.tsx:41`: `border-2 border-foreground`, no radius, `ring-2 ring-ring`.

**Acceptance:** all four detail pages use PageHeader; workout/log screens have zero `rounded-*` and use the display font for titles; no `yellow-*` in session-detail; trainer-application textarea matches coach-note.

---

## Task 9 — Confirmation dialogs for high-stakes actions

**Files:** `components/shared/user-row-actions.tsx`, `coach-notes-list.tsx`, `app/(app)/programs/[slug]/edit/page.tsx`.

- **Promote / Impersonate (critical inversion):** `user-row-actions.tsx:122-135` — "Promote to admin" and "Impersonate" fire on a single `onSelect` with no confirmation, while low-stakes Ban/Remove get full AlertDialogs. Wrap both in an AlertDialog that names the user and the consequence, matching the ban/remove pattern already in the file (~181,246).
- **Coach-note delete:** `coach-notes-list.tsx:57-68` — bare `<form>` one-tap permanent delete. Add an AlertDialog confirm (or an undo toast).
- **Program-delete styling:** `programs/[slug]/edit/page.tsx:93` — the delete `AlertDialogAction` uses default styling while exercise-delete is `bg-destructive`. Apply the destructive class so the most destructive confirm is marked dangerous.

**Acceptance:** promote/impersonate/coach-note-delete each require an explicit confirm naming the target; program-delete action is destructive-styled.

---

## Task 10 — Form error handling + validation

**Files:** `app/(app)/programs/new/page.tsx`, `components/shared/add-exercise-dialog.tsx`, `exercise-actions.tsx`, `program-week-builder.tsx`, `app/(app)/exercises/page.tsx`.

- **Program create:** `programs/new/page.tsx:21` `<form action={createProgram}>` has no try/catch — a rejected create (blank/duplicate name) throws to the error boundary. Wrap in a client handler (like `DetailsHeader` ~186-195) that catches and renders `text-destructive` inline, or `useActionState` for field errors.
- **Add-exercise dialog:** `add-exercise-dialog.tsx:30-33` — `handleSubmit` has no try/catch; failure leaves the dialog open silently. Try/catch + surface the message inside the dialog (mirror `ExerciseActions.handleDelete`).
- **Exercise update:** `exercise-actions.tsx:55-58` — `handleUpdate` lacks the try/catch its sibling `handleDelete` has. Add it.
- **Rep-range validation:** `program-week-builder.tsx:551-569` — no `repRangeMin ≤ repRangeMax` guard; invalid saves and fails server-side. Validate client-side before submit with an inline message.
- **Out-of-range page:** `exercises/page.tsx:57-71` — `?page=999` renders an empty table reading "page 999 of 65". Clamp `page` to `totalPages` (or show the no-results card when `exercises.length===0`).
- **DayLabelEditor keyboard:** `program-week-builder.tsx:367-393` — rename input has no Enter-to-save/Esc-cancel. Add `onKeyDown`.

**Acceptance:** blank/duplicate program name shows inline error (no error-boundary crash); add-exercise failure shows a message and keeps the dialog open with input intact; rep min>max blocked client-side; `?page=99999` shows no-results, not a phantom page.

---

## Task 11 — Form pending / success states

**Files:** `components/shared/assign-program-form.tsx`, `join-trainer-form.tsx`, `trainer-application-form.tsx`, `session-detail.tsx`, `app/(app)/page.tsx`, `app/(app)/programs/page.tsx`.

Add `useTransition`/`useFormStatus` pending state (disabled button + "Saving…"/"Starting…" label) — matching `auth-form.tsx`/`coach-note-form.tsx` — to these server-action forms that currently give no feedback and risk double-submits:

- `assign-program-form.tsx:60`, `join-trainer-form.tsx:41`, `trainer-application-form.tsx:38`.
- `session-detail.tsx:287-292` (Finish workout), `app/(app)/page.tsx:297-309` (Start workout).
- `programs/page.tsx:67-84` (Set active / Duplicate) — add pending state and a success confirmation (toast or inline).

**Acceptance:** each form's primary button disables and shows a pending label on submit; rapid double-tap does not double-fire the action.

---

## Task 12 — Standardize selects; group supporting muscles

**Files:** `app/(app)/programs/new/page.tsx`, `components/shared/program-week-builder.tsx`, `muscle-select.tsx`, `assign-program-form.tsx`.

- **Native `<select>` → shadcn `Select`:** replace the native selects (sub-44px, no focus ring, browser chrome that ignores the brutalist system) with the shared `Select` component at ≥44px: Target RIR in `programs/new:41-52` and `program-week-builder:217-228`, Primary muscle in `muscle-select:35-52`, Target RIR in `assign-program-form:45-57`. Keep an accessible `<label>` association.
- **Supporting-muscle chips:** `muscle-select.tsx:60-79` renders ~25 `px-2 py-1 text-xs` toggle chips as a flat wall, each sub-44px. Group by region (reuse `MUSCLES_BY_REGION`), enlarge tap areas toward 44px, consider collapse-by-default.

**Acceptance:** no native `<select>` remains in these files; every select is the styled `Select` at ≥44px with a visible focus ring and a label; supporting muscles grouped by region.

---

## Task 13 — Cross-cutting accessibility

**Files:** `app/(trainer)/layout.tsx`, `app/(admin)/layout.tsx`, `components/shared/workout-calendar.tsx`, `components/auth/auth-form.tsx`, `app/(app)/exercises/[id]/page.tsx`.

- **Skip-links:** trainer (`layout.tsx:57-62`) and admin (`layout.tsx:62-67`) consoles render `<main id="main-content">` but no skip-link; only `(app)/layout.tsx:22-27` has one. Add the same skip-to-content anchor to both console layouts (extract a shared snippet if clean).
- **Calendar cells:** `workout-calendar.tsx:159` — day `<Link>` announces a bare number. Add `aria-label` like "Mar 15 — Push day, completed" (status currently color+icon only).
- **Auth inline validation:** `auth-form.tsx:85-102` — surface the 8-char password rule as a visible hint under the field; add `aria-invalid` on the failing input on error; keep the preserved-form-state behavior. The generic "Something went wrong" fallback stays, but add a loading spinner to the submit button (text-only today). **Do NOT add "Forgot password?"** (deferred — email provider).
- **Secondary-muscle badge contrast:** `exercises/[id]/page.tsx:78` — badges use `opacity-70` on already-muted text (likely sub-4.5:1 in dark). Use a defined muted token or full opacity instead of `opacity-70`.

**Acceptance:** trainer & admin consoles have a working skip-link; calendar cells announce date + status; password rule visible before submit and `aria-invalid` on error; no `opacity-70` on the muscle badges.

---

## Task 14 — Catalog scale + remaining polish

**Files:** `app/(app)/programs/[slug]/edit/page.tsx`, `components/shared/program-week-builder.tsx`, `pagination.tsx`, `components/landing/kinetic-landing.tsx`, `app/(app)/page.tsx`, `components/shared/trainer-sidebar.tsx` (+ trainer layout), `app/(admin)/admin/page.tsx`, `achievements-showcase.tsx`.

- **Server-backed exercise picker:** `programs/[slug]/edit/page.tsx:35` + `program-week-builder.tsx:609-617` ship the full ~1300-item catalog to the client for local filtering. Back the `ExercisePicker` with a debounced server search action (as the Exercises index already does) instead of serializing the whole catalog.
- **Picker UX/a11y:** `program-week-builder.tsx:622-651` — results `.slice(0,8)` (Miller's ≤4), no no-results state, no `combobox`/`listbox` roles or `aria-live`. Cap ~5, add an explicit "No exercises match" row, add combobox/listbox roles + an `aria-live` result count.
- **Pagination:** `pagination.tsx` — at ~65 pages only prev/next (each 32px). Add first/last (or numbered) controls, enlarge to ≥44px, consider a larger page size.
- **Shadow standardization:** `kinetic-landing.tsx:228,296` and `app/(app)/page.tsx:185` use `5px 5px` offset shadows; the committed token is `4px 4px`. Standardize on 4px across surfaces.
- **Trainer sidebar:** `trainer-sidebar.tsx:7-9` — single "01 Clients" numbered item reads as unfinished, and the trainer layout has no mobile section nav (unlike admin's `AdminNav`). Drop the numbering for the single item and add mobile nav parity.
- **Admin bulk actions:** `admin/page.tsx:83-181` — Users table has no row selection/bulk actions. Add checkbox selection + a bulk action bar (ban/role) for multi-row ops.
- **Achievements empty state:** `achievements-showcase.tsx:20` returns `null` with no achievements → render a lightweight empty prompt (at least the `full` variant on Goals) so first-run users are oriented.

**Acceptance:** editing a program no longer serializes the full catalog (verify the picker still finds exercises via server search); picker shows no-results + has combobox roles; pagination has first/last at ≥44px; no `5px` shadows remain; trainer nav has no stray "01" and works on mobile; admin users support multi-select bulk action; empty achievements shows a prompt.

---

## Execution notes

- Order matters: Tasks 1-2 are foundational primitives; later tasks assume the 44px button scale and overlay overrides exist.
- Each task is mostly independent (different files) except the shared primitives in 1-2. If a later task touches a primitive changed in 1-2, prefer the primitive's new default.
- Update `docs/design-fixes-tracker.md` checkboxes as tasks complete (can be a final sweep).
