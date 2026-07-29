# GymTrack Design Audit & Critique

**Date:** 2026-07-28
**Scope:** Full app — all 25 routes, design system, cross-cutting a11y/perf/responsive.
**Method:** Impeccable `critique` + `audit` + `frontend-design` lens. Assessment A (design review) ran as 5 isolated domain sub-agents; Assessment B (evidence) via the Impeccable deterministic detector + real rendered-DOM inspection.
**Companion:** actionable checklist lives in [`design-fixes-tracker.md`](design-fixes-tracker.md).

> ⚠️ **Partial-degraded run.** Browser automation was not connected this session, so the live visual-overlay pass did not run. Compensated with the deterministic detector (result: **clean, no findings**), SSR-DOM inspection of the public surface, and firsthand reads of core components. Visual-only judgments (exact rendered contrast, motion feel) are inferred from source, not screenshots. Re-run with a browser connected to confirm the contrast estimates.

Judged against the app's **committed brutalist brief** — zero border-radius, hard 2px `--foreground` borders, 4px offset shadows, Archivo Black (display) + Space Mono (body), single chartreuse `--signal` accent, light("paper")/dark("ink"). This is a **refinement** audit: the direction is kept, not questioned.

---

## Scores

### Nielsen Heuristics — 25/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Set-save fails silently; rest-timer end silent on mobile; forms lack pending state |
| 2 | Match System & Real World | 4 | Fluent lifter vocabulary — RIR, sets×reps, previous, day codes |
| 3 | User Control & Freedom | 3 | Discard/cancel dialogs exist; no undo on note delete, no forgot-password |
| 4 | Consistency & Standards | 2 | Brutalist system doesn't reach overlays, several forms, detail headings, native selects |
| 5 | Error Prevention | 2 | Promote-admin & impersonate fire with no confirm; no rep-range validation; double-submit risk |
| 6 | Recognition Rather Than Recall | 3 | Prefilled values, visible nav — but "previous set" reference hidden on mobile |
| 7 | Flexibility & Efficiency | 2 | True 1-tap logging; but no bulk admin actions, no page-jump across 65 catalog pages |
| 8 | Aesthetic & Minimalist Design | 3 | Strong POV; dragged by 9px micro-labels & off-palette accents |
| 9 | Error Recovery | 2 | Auth errors handled well; but silent save failure & dialogs that throw to error boundary |
| 10 | Help & Documentation | 2 | No in-app help, no first-run guidance (empty states return `null`) |

### Technical Audit — 13/20 (Acceptable)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | Sub-44px targets everywhere; invisible keyboard focus on core nav; charts have no text alternative |
| 2 | Performance | 3 | No real hot spots; full 1300-item catalog shipped to client picker |
| 3 | Theming | 3 | Token system consistent; raw-hex muscle map & theme-blind modal scrim |
| 4 | Responsive | 3 | Clean sidebar↔bottom-nav switch, tables get mobile card fallbacks; touch targets miss |
| 5 | Implementation Integrity | 2 | Bespoke chrome is product-specific; overlays/menus/tabs remain generic shadcn |

---

## Implementation-Integrity Verdict — the headline

**This is a real design, not a skin — but the POV only skin-deep covers the app.** The detector came back clean, and the bespoke surfaces (kinetic landing, dashboard, `Block`, nav, buttons/inputs/cards) are authored, confident, and impossible to mistake for another product. The landing especially — "Make the **numbers** move.", day-code hero, kinetic marquees, `prefers-reduced-motion` respected, proper single-`h1` + landmark structure — is category-defyingly specific.

But the brutalist language **stops at the chrome.** Everywhere the user actually *does work* it reverts to default shadcn:

- **Overlays** (`dialog`, `alert-dialog`, `sheet`, `select`, `dropdown-menu`, `tabs`, `tooltip`) keep soft `shadow-md/lg` and thin rings. The `[data-slot]` overrides in `globals.css` reach `card/button/input/select-trigger/textarea` and nothing else. Modals — the most attention-grabbing surface — float as soft rounded shadcn in a hard-edged app.
- **The two most-used screens** (`workout/[sessionId]`, `log/*`) fall back to shadcn `Card` with `rounded-lg` and plain `text-2xl font-bold` sans headings, contradicting the zero-radius, Archivo-Black brief.
- **Stray drift:** `trainer-application-form` textarea is raw rounded shadcn; native `<select>` on RIR/muscle pickers while siblings use styled `Select`; an off-brief `yellow-500` PR badge; 5px vs 4px shadows; hardcoded hex lime ramp in the muscle map.

Fixing this is **mostly additive** — extend the override block, route detail pages through `PageHeader`/`Block`. Low effort, high coherence payoff.

---

## The four P1 clusters

1. **Touch targets miss 44px on the exact scene the app exists for.** The whole premise is *log a set, one-handed, sweaty, between sets* — yet the core controls are 36px or smaller, rooted in `button.tsx` sizing and repeated in the set-logger, rest-timer, and header.
2. **The core write path fails silently.** `set-logger` optimistically fills the check then reverts on error with zero messaging; the rest-timer loses state on backgrounding and signals "rest over" with no sound/vibration and a mobile-hidden label.
3. **Charts are invisible in light mode.** Trend lines stroked in `--signal` (oklch 0.9) on the paper background (oklch 0.985) ≈ 1.3:1. Charts also lack `role="img"`/text alternatives and have mouse-only tooltips. The defined `--chart-1..5` tokens are unused everywhere.
4. **The brutalist system doesn't reach the working surfaces** (see verdict above).

Plus a P2 safety inversion: **promote-to-admin and impersonate fire with no confirmation** while low-stakes ban/remove get full dialogs.

---

## Persona red flags

- **Casey (one-thumb mobile):** sub-44px controls; "previous set" reference & rest presets are `hidden sm:*` — gone on the phone that is the entire use case; timer state lost on app-switch; rest-over silent in pocket.
- **Sam (screen reader + keyboard):** charts announce nothing; core nav has no visible focus ring; titles are `<span>`s so the outline is flat; trainer/admin consoles have no skip-link; muscle map is color-only.
- **Riley (stress tester):** blank/duplicate program name throws to the error boundary; `add-exercise-dialog` swallows failures; `?page=999` renders "page 999 of 65"; rep-min 12 / rep-max 5 saves and fails server-side.

---

## What's working — keep it

- A genuine, rare POV. Detector-clean, memorable landing, confident brutalist chrome.
- Domain fluency: RIR, kg×reps, previous-set prefill, day codes.
- The logging primitive is fast — correct `inputMode` keyboards, focus-select, haptics, true 1-tap when prefilled.
- Responsive tables done right — every admin/trainer table ships a mobile card fallback; no horizontal overflow.
- Auth is solid — `role="alert"` errors, form state preserved on failure, correct autocomplete tokens, theme-flash prevented pre-paint.

---

**Bottom line:** a strong, singular design idea that only half-covers its own app, held back on the exact mobile between-sets moment it was built for. The gap is mostly additive polish, not rework. Work items tracked in [`design-fixes-tracker.md`](design-fixes-tracker.md).
