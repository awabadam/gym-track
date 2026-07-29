# Design Modernization — Implementation Plan (Phase 2)

Follow-on to the 2026-07-28 audit fixes. Direction chosen: **"modern shell, keep the edge"** — evolve within our neo-brutalist identity toward *refined* neo-brutalism (bold borders + hard offset shadows + flat color, but more whitespace, clearer hierarchy, and restraint), grounded in web research on the fitness niche + the maturing neo-brutalism trend.

**Branch:** `design-modernize` (already carries: full-bleed shell, spatial rhythm, staggered reveal).
**Identity to preserve everywhere:** zero radius, 2px `--foreground` borders, Archivo Black + Space Mono, single `--signal` chartreuse accent, light("paper")/dark("ink").

Ordered by impact/leverage. Each workstream is mostly independent.

---

## W1 — Consistency & streak block  *(the niche gap; highest impact)*

**Why:** streaks + milestone visibility are the #1 retention pattern across Strong/Hevy/Fitbod and every fitness-UX source. We surface none. A brutalist consistency grid (GitHub-contribution-graph rendered as hard-bordered squares) fits our aesthetic perfectly.

**Approach:**
- Data: reuse the session-range already fetched on the dashboard (`getSessionsInRange`, `app/(app)/page.tsx:74`). Add `data/sessions.ts` helpers: `getCompletedSessionDates(days)` → `Set<'YYYY-MM-DD'>`, and a pure `computeStreak(dates, scheduleContext)` in `lib/` (unit-testable — the one place here worth a test).
- New `components/shared/consistency-strip.tsx` (server component, no client state): a grid of day cells for the last ~12 weeks. Cell states: completed (`bg-signal` or `--muscle-tier`-style intensity by set volume), scheduled-missed (ink outline), rest (muted). Weekday-rows × week-columns, brutalist 2px borders, `tabular-nums` legend.
- Headline stats: **BOTH streaks** (locked decision — two dopamine signals), shown as two brutalist stats reusing the stat-strip visual language, plus a supporting count (e.g. "18 workouts / 30 days"):
  - **Weekly streak** — consecutive weeks meeting the program's scheduled sessions (forgiving of rest days).
  - **Session streak** — consecutive scheduled training-days completed without a miss.
- `computeStreak(dates, schedule)` returns `{ weeklyStreak, sessionStreak, workoutsLast30 }`. Unit-test both.
- Placement: dashboard, directly under the stat strip (`app/(app)/page.tsx` ~line 210), inside the reveal cascade (add `[animation-delay:110ms]`). Optional compact variant on `/progress`.

**DECISION (locked):** show BOTH weekly + session streaks. Both feed W5 milestone celebrations.

**Effort:** M. **Acceptance:** grid renders from real sessions in both themes, streak number matches a hand-checked example, block joins the reveal cascade, no color-only meaning (legend + counts).

---

## W2 — Chartreuse restraint pass  *(quick refinement; do right after W1)*

**Why:** refined neo-brutalism reserves the accent so it *commands* attention; raw brutalism colors everything. We have 59 `bg-signal` uses and ~10 full hover-fills — the "everything turns chartreuse on hover" reads raw.

**Approach — establish one rule, then apply:**
- **Rule:** `--signal` is reserved for (1) the single primary action on a surface, (2) *live/now* state, (3) personal-record / achievement data, (4) the active nav item. Everything else (secondary row hovers, decorative chips) uses a **neutral** hover/emphasis (`hover:bg-foreground hover:text-background`, or `bg-muted`).
- Targets (from grep): dashboard row hovers that fill signal — `app/(app)/page.tsx` today-exercise rows (~275), recent-session rows (~467), week rows; `session-detail.tsx` row hovers; any list-row `group-hover:bg-signal`. Convert secondary rows to the neutral hover; **keep** signal on: the Start button, "// Live" in-progress, PR badges, active nav (`nav-sidebar` active), set-logger saved row (key data).
- Audit the 59 `bg-signal` chips: keep functional (primary/live/PR/active), neutralize purely decorative ones.

**DECISION (locked):** (a) secondary only — neutralize secondary list-row hovers + decorative chips; keep all functional signal (Start, live, PR, active nav, set-logger saved). Hero/stat strip untouched.

**Effort:** S–M. **Acceptance:** signal appears only on functional elements per the rule; a screenshot of the dashboard shows chartreuse as punctuation, not wallpaper; both themes fine.

---

## W3 — Modulate brutalism intensity by surface  *(quiet the data-dense screens)*

**Why:** every source flags heavy neo-brutalism *fights* data-dense dashboards. Keep bold on expressive surfaces (dashboard, landing, active workout); dial to a **quieter** register on data surfaces (Progress, Admin tables, charts) so data leads.

**Approach:**
- Introduce a **"quiet surface" register** (opt-in, not a global change): a card/section treatment with the 2px border retained but **no offset shadow**, reduced internal color, and more whitespace. Mechanism options:
  - Add a `quiet` variant to `Block` (`components/shared/block.tsx`) and/or a `.surface-quiet` utility in `globals.css` that neutralizes the `[data-slot=card]` offset shadow (`box-shadow: none`, tighter header).
- Apply to: `/progress` (`app/(app)/progress/page.tsx` — currently shadcn `Card`s w/ inherited offset shadow), `/admin` users table (`admin-users-table.tsx` / `admin/page.tsx`), chart containers. Increase inter-section spacing (reuse the W-rhythm scale).
- Keep the loud register on dashboard/landing/workout.

**DECISION (locked):** (a) drop the offset shadow + reduce color on data surfaces; **keep the 2px borders**. Calmer and scannable, still unmistakably ours.

**Effort:** M. **Acceptance:** Progress + Admin read calmer/scannable, data leads; dashboard/landing unchanged and still bold; the two registers feel intentional, not inconsistent.

---

## W4 — Focus states as a signature  *(cheap, on-brand polish)*

**Why:** the neo-brutalism guides note "thick outlines actually suit this style." We added *functional* focus rings in the audit; make them a *stylistic feature*.

**Approach:**
- Define one brutalist focus treatment as a token/utility in `globals.css`: a thick (2–3px) hard `--foreground` (or `--signal` on dark surfaces) `outline` with an offset, no blur — consistent everywhere.
- Replace the ad-hoc per-component `focus-visible:outline-*` (added in audit Task 5/13) with the shared utility; ensure it's visible on the interactive brutalist controls (buttons, nav, inputs, cards-as-links).
- Verify contrast of the focus color on both `--background` and `--card` in both themes.

**Effort:** S. **Acceptance:** every interactive element shows the same bold, intentional focus outline (keyboard-tab the dashboard + a form); visible in both themes; no regression to the audit's a11y wins.

---

## W5 — Extend the celebration moments  *(delight; partly depends on W1)*

**Why:** "micro-interaction rewards" is a top engagement pattern. We celebrate 1RMs only.

**Approach:**
- Extract the celebration UI from `strength-section.tsx:290-330` (`Confetti` + `animate-pop` stamp) into a reusable `components/shared/brutal-celebration.tsx` (props: headline, sub, variant). CSS already exists (`globals.css` `animate-pop`, `confetti-fall`, guarded by the new reduced-motion rule — verify the celebration also respects it).
- Trigger on: **streak milestones** (from W1 — e.g. 4-week / 8-week / 12-week), and existing 1RM/goal hits (refactor to the shared component).
- **Volume PRs** (optional, needs data): we don't currently compute session/exercise tonnage PRs. If wanted, add a `data`/`lib` helper for best-volume and trigger on beating it — flag as a sub-item, not required for W5.

**DECISION (locked):** ship W5 as reusable celebration component + **streak-milestone triggers (both weekly & session) + 1RM/goal refactor**. Volume PRs deferred (separate future data task).

**Effort:** S (refactor + streak triggers). **Acceptance:** a shared celebration component drives 1RM + streak-milestone moments, respects reduced-motion, stays on-brand (brutalist stamp).

---

## Cross-cutting

- **Reduced-motion:** any new motion (celebrations, cascade extensions) must fall under the `prefers-reduced-motion` guard already in `globals.css`.
- **Verification:** `tsc` + `lint` + `npm run build` (the RSC-boundary catcher) per workstream; drive the affected route on the running dev server. Add a unit test ONLY for `computeStreak` (real logic).
- **Both themes** checked for every color/shadow change.

## Suggested order & execution
W1 → W2 → W3 → W4 → W5. Recommend **iterative execution** (tight visual loop on the running dev server, one workstream at a time, you review each), not a big fan-out — these are creative/visual changes best judged by eye. W1 and W5 are substantial enough to structure carefully; W2/W4 are quick sweeps.

## Decisions (locked)
1. **Streak definition** — W1: **BOTH** weekly + session streaks (two dopamine signals; both feed W5 milestones).
2. **Restraint aggressiveness** — W2: secondary-only (keep functional signal).
3. **Data-surface quieting depth** — W3: drop shadow + color, keep 2px borders.
4. **Volume PRs in W5?** — deferred; W5 = celebration component + streak-milestone + 1RM refactor.
