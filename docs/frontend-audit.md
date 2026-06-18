# GymTrack Frontend Design Audit

Date: 2026-06-16

## Overall Assessment

The app is functionally solid — CRUD works, data flows correctly, the progression engine is smart. But visually it reads as a database admin panel that happens to track workouts, not a product someone opens between sets at the gym. The design is competent shadcn defaults with no identity of its own.

---

## 1. Identity & Aesthetic Direction

- [x] **No visual personality** — shifted to amber/industrial aesthetic with card depth and motion
- [x] No brand color beyond default blue primary — **switched to amber (`oklch(0.75 0.18 55)`)**
- [ ] No custom typography — Geist is fine for a dev tool, generic for a fitness app
- [ ] No visual motifs (no bold shapes, no energy, no weight-plate metaphors)
- [x] No texture or depth — **added card shadows, deeper background tones**
- [x] Zero motion/animation — **added set-saved bounce animation**

**Recommendation:** Commit to an aesthetic. For a gym app targeting serious lifters, push toward industrial/utilitarian — raw concrete feel, high-contrast, monospaced numbers front and center, bold accent color (amber/orange, not blue), tight spacing that feels dense and purposeful like a lifting log. The numbers are the hero, not the chrome.

---

## 2. Typography

- [ ] Geist Sans everywhere — clean developer font but zero character for a fitness context
- [ ] Page titles are all `text-2xl font-bold` — no variation in weight/size hierarchy between pages
- [ ] Card titles are all `text-base` — too uniform, everything feels same-priority
- [x] `text-[10px]` on some badges is too small — **bumped to `text-[11px]` / `text-xs`**
- [ ] No display font for headings — missed opportunity for brand feel

**What's working:** Monospace usage (`font-mono tabular-nums`) on numbers is correct and good — strongest typographic choice in the app.

**Recommendation:**
- Keep Geist Mono for all numeric data (weights, reps, dates, timers)
- Consider a heavier/more characterful heading font (condensed weight, uppercase for section headers)
- Increase minimum text size to 12px — anything smaller is invisible in a gym
- Use font weight variation more aggressively: `font-black` for hero numbers, `font-light` for labels

---

## 3. Color System

- [x] Dark mode palette is neutral gray — **primary shifted to amber hue 55**
- [x] `bg-green-500/5` on saved sets is almost invisible — **bumped to `/12`**
- [ ] No gradient or color depth anywhere — everything is flat single-color fills
- [x] Chart colors (`chart-1` through `chart-5`) are all achromatic grays — **now colorful (amber, green, blue, purple, coral)**
- [ ] Weekly overview status colors are hard to distinguish at a glance

**Recommendation:**
- ~~Swap primary to something warmer~~ **Done**
- ~~Push semantic backgrounds to 12-18% opacity minimum~~ **Done**
- Add a subtle gradient to primary CTA buttons ("Start workout" / "Finish workout" deserve visual weight)
- Use primary accent more — currently it only appears on the ring and a few buttons

---

## 4. Layout & Spatial Design

- [x] Dashboard: calendar and "this week" side-by-side on desktop — **`md:grid-cols-2`**
- [ ] Program edit page is very long — no collapsible sections
- [x] Workout session page constrained — **`max-w-xl mx-auto`**
- [ ] Tables go edge-to-edge in cards with no horizontal padding — abrupt visual transition

**Recommendation:**
- ~~Dashboard: side-by-side~~ **Done**
- ~~Workout session page: constrain width~~ **Done**
- Add visual breaks between sections — not just `space-y-6`, use subtle dividers or section labels
- Program edit: collapsible day cards would dramatically reduce scrolling

---

## 5. Navigation (Critical)

- [x] **Bottom tab navigation added** — 5 tabs (Home, Log, Workout elevated, Programs, Progress)
- [x] Sidebar hidden on mobile — **returns null via `useIsMobile()`**
- [x] `AppHeader` bumped to `h-14`
- [x] "Start workout" prominent in bottom nav center tab

---

## 6. Workout Session Page (Critical UX Surface)

- [ ] Set logger inputs are `w-20` / `w-16` — could be wider on mobile to fill available space
- [x] RIR stepper has no label — **added "RIR" label**
- [x] Previous set data opacity — **bumped to `/80`**
- [x] Progression message — **bumped to `/80` opacity**
- [x] Confirm button visual feedback — **added `animate-set-saved` bounce + green bg**
- [x] Rest timer display — **bumped to `text-4xl font-bold`**, "REST OVER" text
- [x] Per-exercise progress — **colored progress bar + `{logged}/{total}` set counter**
- [x] "Back to log" — **proper Button component**

---

## 7. Mobile Touch Targets

- [x] Action buttons bumped from `h-7 w-7` to `h-8 w-8` (exercise rows, day actions)
- [x] Copy button bumped to `h-10 w-10` (programs page, edit page)
- [x] Calendar nav buttons bumped to `h-10 w-10`
- [ ] On mobile, exercise row actions could expand to a dropdown menu

---

## 8. Empty States

- [x] Programs page — **icon + headline + subtitle + CTA**
- [x] Progress page — **icon + headline + subtitle + CTA**
- [x] Workout page (no program) — **icon + headline + subtitle + CTA**
- [x] Rest day card on dashboard — **Moon icon + headline**

---

## 9. Cards & Depth

- [x] Cards have shadow — **`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.2)` via `[data-slot="card"]`**
- [x] Card background adjusted — **`oklch(0.18 0 0)` on `oklch(0.13 0 0)` background**
- [ ] All cards look identical regardless of importance
- [ ] Nested content (tables, forms) has no visual separation from card container

---

## 10. Data Visualization (Progress Page)

- [x] Weekly volume — **CSS bar charts with percentage widths**
- [ ] No sparklines for weight progression per exercise
- [ ] No comparison to previous weeks/months
- [ ] No streak/consistency metric on dashboard

---

## 11. Consistency Gaps

- [x] **Date formatting** — **dashboard uses `formatDate()` helper for "Jun 16" format**
- [ ] **Font-mono on numbers:** Generally applied well but some table cells miss it
- [ ] **Card padding:** inconsistent overrides

**What's consistent (good):**
- Badge usage: `variant="outline"` for muscle groups, `variant="secondary"` for types, `variant="default"` for status
- Page headings: always `text-2xl font-bold`

---

## 12. Accessibility

- [x] Skip-to-content link — **added `sr-only focus:not-sr-only` link**
- [ ] Rest timer uses color to indicate time ranges with no alternative indicator
- [x] `aria-label` on icon-only buttons — **added across all components**
- [x] `text-[10px]` bumped to `text-[11px]` / `text-xs` minimum

**What's working:**
- Color-only status indicators on weekly overview also have icons (Check, AlertTriangle)
- Focus rings present from shadcn defaults
- `pattern="[0-9]*"` on inputs for iOS numeric keyboard

---

## Priority Ranking

| # | Item | Impact | Effort | Status |
|---|------|--------|--------|--------|
| 1 | Bottom tab navigation | Highest | Medium | **Done** |
| 2 | Workout session page refinement | High | Low-Medium | **Done** |
| 3 | Color/accent overhaul | High | Low | **Done** |
| 4 | Progress page visualization (CSS bars) | High | Medium | **Partial** — bars done, sparklines remaining |
| 5 | Mobile touch targets | Medium | Low | **Done** |
| 6 | Empty state consistency | Medium | Low | **Done** |
| 7 | Card depth/shadow | Medium | Low | **Done** |
| 8 | Typography personality | Medium | Medium | **Partial** — size bumps done, no display font yet |
| 9 | Accessibility sweep | Medium | Low | **Done** |
| 10 | Animation/micro-interactions | Lower | Medium | **Partial** — set save animation done |
| 11 | Dashboard layout (side-by-side) | Lower | Low | **Done** |
| 12 | Date formatting consistency | Lower | Low | **Done** |
