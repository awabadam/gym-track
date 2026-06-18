# Workout App Research — Competitive Analysis & UX Patterns

Research compiled from analysis of Strong, Hevy, Alpha Progression, Fitbod, FitNotes, and JEFIT.

---

## 1. Competitor Breakdown

### Strong — The Speed King

**Philosophy:** Pure tool, fast logging. No social, no bloat.

**What users love:**
- Fastest set logging in the market — minimal taps to record
- 300+ exercises with animated GIFs
- One-tap template start pre-fills last session's weights/reps
- Best-in-class Apple Watch app (standalone workout from wrist)
- CSV data export

**Set logging UX (the industry standard):**
```
SET | PREVIOUS | WEIGHT | REPS | ✓
 1  | 80kg×8   | [80  ] | [10] | ☑
 2  | 80kg×8   | [80  ] | [ 9] | ☐
 3  | 80kg×7   | [    ] | [  ] | ☐
                          [+ Add Set]
```
- Custom numeric keypad (not system keyboard) — includes decimal + increment buttons
- Pre-filled from previous session — only change what's different, then checkmark
- Swipe to delete sets, drag handles to reorder exercises
- **No native RPE/RIR** — biggest limitation cited by advanced users

**Programs:** Static templates only. No periodization, no progression logic, no multi-week plans. Users manually update weights. This is frequently cited as the main limitation.

**Rest timer:** Auto-starts on set completion. Configurable per exercise. Notification + vibration. Non-intrusive banner — can scroll/prep while it counts.

**Progress:** Per-exercise line charts (E1RM, volume, best set). Calendar with dots. PR badges (weight PR, volume PR, 1RM PR). Body measurement tracking.

**Pricing:** Free = 3 routines. Pro subscription for unlimited. The gating is frequently criticized.

---

### Hevy — Social + Modern UI

**Philosophy:** Strong's logging speed + social accountability + generous free tier.

**What users love:**
- Social feed (see friends' workouts, reactions, comments) — drives accountability
- Unlimited routines on free tier (huge growth driver vs Strong)
- Modern, clean UI
- **Full web app** at hevy.com — major differentiator
- Community routine library (PPL, 5/3/1, nSuns pre-built)

**Set logging additions over Strong:**
```
SET | PREVIOUS | WEIGHT | REPS | RPE | ✓
 W  | --       | [40  ] | [10] |     | ☑  ← warm-up toggle
 1  | 80kg×8   | [80  ] | [10] | [7] | ☑
 2  | 80kg×8   | [80  ] | [ 9] | [8] | ☐
 D  | --       | [60  ] | [12] |     | ☐  ← drop set
```
- **RPE/RIR column** — optional, toggleable in settings
- **Set type indicators:** Warm-up (W), Normal, Drop (D), Failure (F)
- Per-exercise and per-workout notes
- Exercise replacement mid-workout (swap without losing structure)

**Programs (Pro):** Multi-week structured programs with progression rules (e.g. +2.5kg/week). Programs loop/repeat. Weeks × days structure with deloads.

**Rest timer:** Auto-start on completion. **+30s / -30s quick adjust buttons** — great pattern. Full-screen option. Persists across navigation.

**Progress:** Per-exercise graphs. **Muscle group heatmap on body silhouette** — standout feature. Weekly volume per muscle group bar charts. PR badges + workout streaks. Workout comparison (side-by-side).

**Pricing:** Generous free tier (unlimited routines, logging, social). Pro for programs, advanced analytics, themes.

---

### Alpha Progression — AI Coach

**Philosophy:** Remove the need for programming knowledge. AI generates evidence-based programs.

**What users love:**
- AI program generation (input goals/schedule/equipment → full periodized program)
- Evidence-based volume tracking (MEV/MAV/MRV landmarks from research)
- Fully automated progressive overload — app tells you exactly what to lift
- Auto-regulation — adjusts based on performance

**Set logging — prescriptive approach:**
```
Bench Press — Target: 80kg × 8 reps @ 2 RIR
SET | TARGET    | ACTUAL  | REPS | RIR | ✓
 1  | 80kg × 8  | [80  ] | [ 8] | [2] | ☑
 2  | 80kg × 8  | [80  ] | [ 7] | [1] | ☐
```
- Shows **prescribed targets** — user follows the plan, logs actual performance
- **RIR is central** (not optional like Hevy) — drives the progression algorithm
- App adjusts future sessions based on logged vs prescribed performance

**Programs:** AI-generated mesocycles (4-6 weeks) with deloads. Supports linear, undulating, and block periodization. Equipment-aware exercise selection. Users can swap exercises and AI re-optimizes.

**Progress:** **Volume landmarks (MEV/MAV/MRV) per muscle group** — the standout. Muscle group balance radar chart. Strength prediction. Adherence tracking.

---

## 2. Universal UX Patterns (Industry Standard)

These patterns appear in every successful app:

| Pattern | Description |
|---------|-------------|
| **Set-row table** | SET # \| PREVIOUS \| WEIGHT \| REPS \| CHECK — the de facto logging standard |
| **Previous performance inline** | Last session's numbers shown in every row — critical for progressive overload |
| **Tap-to-complete checkmark** | Per-set confirm button — the core interaction |
| **Auto-start rest timer** | Checkmark triggers countdown — universal expectation |
| **Template/routine system** | Save and reuse workout structures — minimum viable feature |
| **Custom numeric keypad** | Optimized for weight/rep entry — not system keyboard |
| **Exercise database with demos** | Animated GIFs/videos for form |
| **Pre-filled from last session** | Template start = last session's weights already in fields |

---

## 3. Dashboard Design

**What works (from top apps):**

- **Home screen prioritizes action** — "Start Workout" CTA + recent history. Not analytics-heavy.
- Strong: home = workout log + start button. No dashboard clutter.
- Hevy: home = social feed (engagement). Profile = stats/analytics.
- Fitbod: home = today's recommended workout + muscle recovery heatmap.
- FitNotes: home = calendar. Tap date to see workout.

**Key dashboard metrics across apps:**

| Metric | Where to show |
|--------|---------------|
| Recent workouts | Primary — scrollable list on home |
| In-progress session | Top banner if active |
| Today's scheduled workout | Prominent CTA |
| Weekly overview | Collapsible card (Mon-Fri status) |
| Total volume / workout count | Profile/stats section |
| Workout streak | Gamification element |
| PR count | Badge on profile |

**Takeaway:** The home screen should be **action-oriented** (start/resume workout) with recent history. Summary stats and analytics belong one tap away, not on the home screen.

---

## 4. Progress Visualization

### Must-Have Charts

1. **Per-exercise line chart** — E1RM / max weight / total volume over time, with time range filters (1mo, 3mo, 6mo, 1yr, all)
2. **PR matrix** — Best weight at each rep count (1RM, 3RM, 5RM, 8RM, 10RM, 12RM). Valued by intermediate+ lifters.
3. **Weekly muscle group volume** — Horizontal bar chart with target ranges overlaid

### Nice-to-Have

4. **Calendar heatmap** (GitHub-style) — workout frequency visualization
5. **Muscle body map** — anterior + posterior silhouette with color-coded volume/fatigue
6. **Radar chart** — muscle group balance spider chart

### PR Detection

- Highlight PRs **during logging** with badges (gold/yellow)
- Track: weight PR, volume PR, E1RM PR per exercise
- Hevy: confetti animation on new PRs
- PR history timeline per exercise

---

## 5. Volume Tracking

### Recommended Weekly Sets Per Muscle Group

Based on Renaissance Periodization research (Dr. Mike Israetel):

| Muscle Group | MEV (Minimum) | Recommended | MRV (Maximum) |
|-------------|---------------|-------------|----------------|
| Chest | 8 | 10-20 | 20-22 |
| Back | 8 | 10-20 | 20-25 |
| Quads | 6 | 8-18 | 18-20 |
| Hamstrings | 4 | 6-16 | 16-18 |
| Side Delts | 6 | 8-20 | 20-26 |
| Biceps | 4 | 6-14 | 20-26 |
| Triceps | 4 | 6-14 | 18-20 |
| Glutes | 0 (if squatting) | 4-12 | 16 |
| Calves | 6 | 8-16 | 16 |
| Abs | 0 | 4-12 | 16 |

### How to Display Volume

```
Muscle Group    This Week    Target       Status
Chest           12 sets      [====|=======|---]  OK
Back            16 sets      [====|===========]  OK
Quads            6 sets      [===|-----|------]  Low ⚠
Hamstrings       4 sets      [==|------|------]  Low ⚠
```

- Horizontal bars with shaded target zone (green = in range, red = under MEV or over MRV)
- Allow users to customize target ranges
- Track primary AND secondary muscle involvement for compounds
- Show per-week with ability to scroll through weeks

---

## 6. Double Progression UX

### How It Works
1. Set weight + rep range (e.g., 80kg for 8-12 reps)
2. Keep weight constant, add reps each session until all sets hit top of range
3. Increase weight, drop back to bottom of range
4. Repeat

### Implementation Patterns

**Rep range indicator per set:**
- Below range = red ("need more reps")
- In range = yellow ("progressing")
- At top of range = green ("ready when all sets hit this")

**Progression banner:**
When all sets hit top of range in previous session:
```
┌──────────────────────────────────────────────┐
│ ↑ Ready to increase! Suggested: 82.5kg × 8  │
└──────────────────────────────────────────────┘
```

**Weight increments:** Configurable per exercise (2.5kg upper body, 5kg lower body default)

**Deload detection:** If user fails to hit bottom of range for 2+ sessions → suggest reducing weight by 10%

### What Advanced Users Want
- Multiple progression schemes (double progression, linear, percentage-based, RPE-based)
- Deload week suggestions after 4-6 weeks
- Fatigue management (RPE trending up without performance gains → back off)
- Per-exercise configurable progression rules

---

## 7. Program Building UX

### Exercise Library Best Practices
- **Categories:** by muscle group (primary), movement pattern (secondary), equipment (tertiary)
- **Search:** fuzzy search with muscle group filters
- **Custom exercises:** user-created with muscle group tagging
- **Recently used / favorites** section at top
- **Exercise alternatives:** suggest swaps (e.g., dumbbell press if bench unavailable)

### Superset / Circuit Handling
- Visual bracket or connecting line between grouped exercises
- Letter badges (SS-A, SS-B) on grouped exercises
- During logging: supersetted exercises appear sequentially with no rest timer between them
- The grouping should be clear but not intrusive

### Program Scheduling
- Weekly schedule with day assignments
- Rest day marking
- Deload week support
- Cycle/rotation for programs that don't map to fixed weekdays

### Mobile-First Gym UX
- **Large tap targets** — fingers are sweaty, grip is tired. Minimum 44px touch targets.
- **One-hand operation** — most critical actions reachable with thumb
- **High contrast** — gyms have mixed lighting. Dark mode with high contrast text.
- **Minimal typing** — numeric keypads, pre-filled values, increment buttons
- **Screen-on mode** — prevent auto-lock during workout
- **Offline-capable** — gym basements have no signal
- **Quick undo** — typos happen (80kg vs 8kg). Easy set editing.

---

## 8. Common User Complaints (from Reddit/forums)

| Complaint | Apps Affected | Solution |
|-----------|--------------|----------|
| Can't edit completed sets | Strong (older versions) | Always allow editing logged sets |
| No program progression logic | Strong | Multi-week programs with auto-progression |
| Social feed is noisy | Hevy | Keep social optional, not on home screen |
| Too many taps to log | Various | Pre-fill from previous + one-tap confirm |
| Can't compare same workout over time | Most apps | Side-by-side workout comparison |
| No "copy last workout" | Some apps | Pre-fill today from last identical session |
| Rest timer not prominent enough | Many apps | Sticky bottom bar, not floating pill |
| No web/desktop companion | Strong | Web app for planning on big screen |
| Volume tracking doesn't count compounds properly | Most | Track primary + secondary muscle involvement |
| Exercise reordering is clunky | Various | Drag-and-drop or clear up/down buttons |

---

## 9. Exercise Library Best Practices

Current GymTrack exercise library is basic. What competitors do:

- **Primary organization by muscle group** — how lifters think ("I need a chest exercise")
- **Equipment filter** as secondary — home gym vs commercial gym users differ
- **Fast, forgiving search** — handle abbreviations ("BB bench" = "Barbell Bench Press") and typos
- **Recently used / favorites** at top of picker — most users rotate 20-30 exercises
- **Exercise aliases** — "Skull crushers" = "Lying tricep extensions"
- **Bottom sheet picker** (not full-page navigation) — preserves context during workout
- **Custom exercises** with muscle group + equipment tagging

---

## 10. Superset UX Deep Dive

Current GymTrack: superset group letter badge (SS A). What competitors do better:

- **Visual bracket/colored sidebar** connecting grouped exercises — dominant pattern
- **Linking gesture:** long-press drag onto another exercise, or "link" button between adjacent exercises
- **During logging:** auto-advance to next exercise in superset after completing a set
- **Rest timer behavior:** no timer between exercises within superset, longer timer after completing full round
- **Drop set button:** adds a new set below with weight pre-filled at -20%
- **Set type labels:** Warm-up (W), Normal, Drop (D), Failure (F) — small badges on set rows. Warm-up sets excluded from volume tracking.

---

## 11. Mobile-First / Gym-Specific UX

### Critical Missing Patterns

| Pattern | Status | Impact |
|---------|--------|--------|
| **Screen wake lock** during active workout | Missing | High — #1 complaint when absent, chalky hands + locked screen |
| **System notification for rest timer** | Missing | High — works when user switches to Spotify |
| **Offline support** | Missing | High — gym basements have no signal |
| **Plate calculator** | Missing | Medium — "what plates for 102.5kg?" |
| **Unit toggle** (kg/lb) | Missing | Medium — quick switch without settings |
| **Custom numeric keypad** | Missing | Medium — faster than system keyboard |

### Patterns We Already Handle Well
- Large touch targets on set inputs (h-10)
- Dark mode with contrast
- Bottom-anchored rest timer
- Pre-populated weight from progression engine

---

## 12. Common User Complaints (from Reddit/App Store)

**Top 10 pain points across all apps:**

| # | Complaint | Our Status |
|---|-----------|-----------|
| 1 | Paywalls on basic features (routine creation) | N/A — free |
| 2 | Poor periodization/percentage-based programming | Partial — have double progression, no % based |
| 3 | Can't substitute exercises (same muscle group swap) | Missing |
| 4 | Data lock-in / no export | Missing |
| 5 | Slow exercise search | Basic — no fuzzy search or favorites |
| 6 | No warm-up set handling | Missing |
| 7 | Cluttered UI during workout | OK — our logger is clean |
| 8 | No plate calculator | Missing |
| 9 | Social features nobody asked for | N/A — we don't have social |
| 10 | Can't edit completed sets | Fixed — pencil edit button |

---

## 13. What GymTrack Should Prioritize

### Already Built ✓
- Set logging with weight/reps/RIR
- Program builder with days and exercises
- Rest timer (sticky bottom bar with presets)
- Exercise reordering (up/down arrows)
- Double progression engine
- Weekly volume summary (progress page + program detail)
- Loading skeleton states
- Mobile-friendly inputs (large targets, flex-wrap)
- Set editing (pencil button on completed sets)
- Day/program duplication
- Day code auto-generation
- Today highlight on workout picker
- "Last trained" relative dates
- Weekly overview on dashboard

### High Priority — Build Next
1. **"Previous" column in set logger** — show last session's weight×reps inline. THE feature every competitor has.
2. **Pre-fill from last session** — when starting a workout, pre-populate from progression engine + last session data.
3. **Per-exercise progress charts** — line chart of E1RM over time. Most requested visualization.
4. **PR badges during logging** — highlight when a set is a new record.
5. **Screen wake lock** — prevent auto-lock during active workout. Critical gym UX.
6. **Exercise search improvements** — fuzzy search, recent/favorites section, muscle group filter in picker.

### Medium Priority
7. **Calendar view for workout history** — toggle between list and calendar.
8. **Muscle group volume bar chart** with target ranges (MEV/MRV from section 5).
9. **PR matrix per exercise** — best weight at each rep count.
10. **Warm-up / drop set / failure set labels** — badge on set rows, warm-up excluded from volume.
11. **Workout comparison** — same day's workout side-by-side across dates.
12. **Plate calculator** — what plates to load for a given weight.
13. **Exercise substitution** — tap exercise → see alternatives for same muscle group.
14. **Data export** (CSV + JSON).

### Lower Priority (Differentiators)
15. **Calendar heatmap** (GitHub-style workout frequency)
16. **Muscle body map visualization**
17. **Pre-built program templates** (5/3/1, PPL, GZCLP, Starting Strength)
18. **Shareable programs via link**
19. **Percentage-based programming** (training max → auto-calculated weights)
20. **Deload week scheduling** with mesocycle tracking ("Week 3 of 4")
21. **Web companion** for program planning on desktop
22. **AI-assisted program generation**
