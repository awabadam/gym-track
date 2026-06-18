# GymTrack UX/UI Review — 2026-06-16

Findings from full codebase review. Fix in order — bugs first, then high-priority UX, then the rest.

---

## Bugs

- [x] **1. Nested form in program edit** — FIXED
  Moved "Set as active" form outside the "Save details" form.

- [x] **2. Set logger doesn't show completed state after saving** — FIXED
  Stores saved data in local `savedData` state. Also added edit button (pencil icon) on completed sets to fix #7 (edit/undo).

- [x] **3. Exercises dialog won't close on submit** — FIXED
  Extracted to `AddExerciseDialog` client component that controls open state.

---

## UX — High Priority

- [x] **4. Empty header bar** — FIXED
  Added `AppHeader` server component showing active program name, resume/start workout button.

- [x] **5. No mobile-first layout for session logging** — FIXED
  Larger inputs (h-10, w-24/w-20/w-16), tiny labels above each input, flex-wrap for small screens.

- [x] **6. Log page is a dead end** — FIXED
  Sessions are now clickable links to `/workout/[sessionId]`. Shows set count per session.

- [x] **7. Set logger has no edit/undo** — FIXED
  Pencil icon on completed sets re-opens inputs for editing.

- [x] **8. Rest timer too subtle** — FIXED
  Now a sticky bottom bar with countdown presets (1:30, 2:00, 3:00), color-coded timing, pulse on finish.

- [x] **9. No weekly schedule overview on dashboard** — FIXED
  Mon-Fri grid with completed/today/missed/upcoming/rest status indicators.

---

## UX — Medium Priority

- [x] **10. Workout day picker doesn't highlight today** — FIXED
  Today's day has primary border + ring + "Today" badge.

- [x] **11. No "last trained" on workout day picker** — FIXED
  Shows relative date ("2d ago", "1w ago") under each day card.

- [x] **12. Progress page is flat** — FIXED
  Grouped by muscle group with weekly volume badges. Volume summary card at top.

- [x] **13. No exercise reordering in program edit** — FIXED
  Up/down chevron buttons on each exercise row. Swaps sort order with neighbor.

- [x] **14. No loading states** — FIXED
  Skeleton loading.tsx files for all routes (/, /workout, /log, /progress, /exercises, /programs).

- [x] **15. Sidebar "Navigation" label is redundant** — FIXED
  Removed group label, clean nav list.

- [x] **16. Sidebar footer is filler** — FIXED
  Replaced with "Start workout" CTA button.

---

## Design

- [x] **17. No accent color** — FIXED
  Blue accent (oklch 0.65 0.19 250) for dark mode primary. Consistent ring color.

- [x] **18. Inconsistent page max-widths** — FIXED
  All pages constrained by layout `max-w-5xl`.

- [ ] **19. Dense table-in-card on program edit**
  Low priority design preference. Tables are functional and scannable.

- [ ] **20. Bare empty states**
  Low priority. Could add icons + CTAs later.

---

## Missing Features (Program Planning)

- [x] **21. No day duplication** — FIXED
  Copy button on each day card header. Duplicates day + all exercises with "(copy)" suffix.

- [x] **22. No program duplication** — FIXED
  Copy button on programs list. Clones entire program (days + exercises) and redirects to edit.

- [x] **23. Day code is manual** — FIXED
  `AddDayForm` client component auto-generates code from name initials (e.g. "Upper A" → "UA"). Manual override supported.

- [x] **24. No volume summary** — FIXED
  Weekly volume card on program detail page showing sets per muscle group.
