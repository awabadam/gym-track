# GymTrack UX Improvements — Research-Backed Recommendations

Findings from UX research across Strong, Hevy, TheLogger, Fitbod, and mobile design best practices.

---

## 1. Navigation: Switch from Sidebar to Bottom Tab Bar

**Problem:** Sidebar navigation is hidden behind a hamburger icon. 75% of phone interactions use a single thumb (Hoober 2025). Hidden navigation reduces discoverability. When Redbooth switched to bottom nav, they saw 65% increase in DAU and 70% jump in session time.

**Solution:** Bottom tab bar with 4-5 primary destinations.

```
[ Dashboard ]  [ Workout ]  [ Log ]  [ Progress ]  [ More ]
     🏠           💪          📋        📈           ⋯
```

- Keep it to 3-5 items max (Material Design + Apple HIG recommendation)
- "If there are more than three buttons on a tab bar, it's too complicated" — but 5 works with icons + labels
- The "Workout" tab should be visually prominent (larger, accent-colored) — it's the primary action
- "More" tab holds: Programs, Exercises, Settings
- Active state: filled icon + accent color + label. Inactive: outline icon + muted
- Tab bar height: 56-64px. Icons: 24px. Labels: 10-12px.

**Why this matters for us:** Current sidebar requires tapping hamburger → reading menu → tapping destination = 3 steps. Bottom nav = 1 tap.

---

## 2. Set Logger: Reduce to 2-Tap Logging

**Problem:** Our current set logger requires: tap weight field → type weight → tap reps field → type reps → tap RIR field → type RIR → tap save button = 7 interactions minimum. Strong does it in 3. TheLogger does it in 2.

**How competitors achieve speed:**
- **Pre-fill ALL fields** from last session (weight, reps, RIR) — not just weight
- **One-tap confirm** when pre-filled values are correct (just checkmark)
- **Inline adjustment** — tap weight to edit, otherwise leave pre-filled
- TheLogger: "Reps sit right on the row — adjust if needed, confirm, done"
- Strong: "Opening an exercise, you immediately see your previous sets"

**Solution:**
```
Before (current):
  [1]  [____] kg × [____] reps  RIR [__]  [✓]
        ↑ empty      ↑ empty         ↑ empty

After (pre-filled from last session):
  [1]  prev: 80×10   [80  ] kg × [10  ] reps  RIR [2]  [✓]
                       ↑ filled     ↑ filled        ↑ filled
```

If last session's values are correct → just tap ✓. That's 1 tap.
If you need to change weight → tap weight, type new value, tap ✓. That's 3 taps.

**Key changes:**
- Pre-fill reps and RIR from previous session, not just weight
- Make the checkmark button larger and more prominent (48px minimum)
- Consider increment/decrement buttons (+2.5/-2.5) next to weight instead of free-text input
- Show the "previous" data as ghost/placeholder text IN the input fields, not as a separate column

---

## 3. Workout Session: Simplify the Exercise Card

**Problem:** Too much information per exercise card. The card header shows: exercise name, sets×reps badge, superset badge, progression message. Inside: set rows with previous, inputs, buttons. This is dense.

**What the best apps do:**
- Hevy: "clean and efficient workout logger makes complex actions feel simple"
- Strong: "stripped down to essentials — log your sets, track your progress, move on"
- "Users should be occupied by one feature at a time" (MadAppGang)

**Solution — reduce cognitive load:**
- Remove the `3 × 8-12` badge from the header — the set rows already show this information
- Move progression message below the exercise (or show as tooltip), not as subtitle
- Keep only: exercise name + muscle group badge in the header
- Superset indicator: colored left border on the card (like Hevy), not a badge

---

## 4. Micro-Interactions That Matter

**Research findings:**
- Hevy: "completing a set is rewarded with a smooth checkmark animation, making the act of logging feel rewarding"
- TheLogger: "PR detection triggers automatic confetti. Didn't beat it? The app says nothing — no guilt"
- "Animated elements increase engagement. Pulse animations and progress visualizations keep users engaged"

**What to add:**
- Checkmark animation on set completion (scale + color transition)
- PR badge with subtle pulse animation (not confetti — too much for web)
- Progress ring/bar showing sets completed (e.g., 12/18 sets) in the session header
- Rest timer countdown should pulse/change color in last 10 seconds

---

## 5. Input Design for Gym Use

**Research findings:**
- "75% of phone interactions use a single thumb" (Hoober 2025)
- "Minimum 48px touch targets" (WCAG / Material Design)
- "Numeric keyboards automatically appearing for number fields" (MadAppGang)
- "Custom number pad is faster than system keyboard" (Strong, Hevy)

**Current issues:**
- Weight input is `w-24 h-10` = good size but uses `type="number"` which opens full system keyboard
- RIR input is `w-16` = borderline too small
- Labels above inputs ("weight", "reps", "rir") add visual noise

**Solutions:**
- Use `inputMode="decimal"` for weight (shows numeric pad on mobile, not full keyboard)
- Use `inputMode="numeric"` for reps and RIR
- Add `pattern="[0-9]*"` for iOS numeric keyboard
- Consider stepper buttons (- / +) for reps and RIR instead of free text — common values are small integers
- Remove the tiny labels — the placeholder text is sufficient context
- Make the save button full-height of the row and accent-colored

---

## 6. Empty States & Onboarding

**Research findings:**
- "Begin with meaningful goal selection" — position as a partner, not a generic tool
- "Allow users to explore core features without exhaustive data entry"
- "Let them skip detailed setup initially and complete profiles gradually"
- Clue: "displays only a cycle calendar with a central action button" — simplicity first

**Current problem:** New user sees empty dashboard, empty log, empty progress. Each says "No X yet" in gray text. There's no guidance on what to do first.

**Solution — guided first experience:**
1. First visit → show a single prominent card: "Create your first program" with a brief explanation
2. After creating a program → dashboard shows "Start your first workout" card
3. After first workout → progress page shows "Complete more workouts to see trends"
4. Each empty state has an icon, one sentence, and a single CTA button

---

## 7. Dark Mode Optimization

**Research findings:**
- 82% of mobile users prefer dark mode
- Hevy uses `#0A0A0F` background with `#F0F0F5` text
- White overlays at 5-18% opacity for depth/hierarchy (not solid gray borders)
- Accent colors pop more against dark backgrounds

**Current state:** Our dark mode is functional but uses solid gray borders. The research suggests:
- Use `white/[0.08]` borders instead of solid border colors (Hevy's approach)
- Cards: subtle white overlay (`bg-white/[0.04]`) rather than a distinct card color
- Active/selected states: accent color at 10-15% opacity for backgrounds
- Ensure rest timer and PR badges use high-contrast colors that are visible in gym lighting

---

## 8. Priority Order for Implementation

### Phase 1 — Maximum impact, minimal effort
1. **Pre-fill reps + RIR from last session** (not just weight) — data already available
2. **inputMode="decimal"/"numeric"** on inputs — one attribute change, big mobile improvement
3. **Larger checkmark button** — CSS change
4. **Better empty states** — copy + icon per page

### Phase 2 — Navigation overhaul
5. **Bottom tab bar** replacing sidebar — bigger change, high impact on navigation speed
6. **Simplified exercise card** — remove badge clutter, colored superset border

### Phase 3 — Polish
7. **Checkmark animation** on set completion
8. **Stepper buttons** for reps/RIR
9. **Dark mode refinements** (white opacity borders)
10. **Progress ring** in session header

---

## Sources
- [Strong App Review (RepReturn)](https://repreturn.com/strong-app-review/)
- [Hevy UX Analysis (Medium)](https://medium.com/@kellyz94/hevy-8-goals-of-mobile-ux-88dcce85404f)
- [Hevy Screen Designs (ScreensDesign)](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log)
- [TheLogger](https://thelogger.app/)
- [UX Design Principles for Fitness Apps (Superside)](https://www.superside.com/blog/ux-design-principles-fitness-apps)
- [Fitness App Design Best Practices (MadAppGang)](https://madappgang.com/blog/the-best-fitness-app-design-examples-and-typical-mistakes/)
- [Bottom Tab Bar Best Practices (UXPin)](https://www.uxpin.com/studio/blog/mobile-navigation-examples/)
- [Mobile Navigation Material Design](https://m2.material.io/components/bottom-navigation)
- [Reddit Workout App Recommendations (Setgraph)](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)
- [Hevy vs Strong Comparison](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)
- [Load Muscle vs Hevy](https://loadmuscle.com/blog/load-muscle-vs-hevy)
