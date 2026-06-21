# Progression Engine

[← Wiki Home](README.md)

The progression engine turns your logged history into a concrete next-session recommendation: **add weight**, **push for more reps**, or **hold/deload**. It's the app's signature feature. Two files:

- **`lib/calculations.ts`** — pure math (1RM, volume)
- **`lib/progression.ts`** — the double-progression decision logic

It's consumed by [`data/progress.ts`](data-layer.md) (the `/progress` page) and surfaced inside the workout view via [`session-detail.tsx`](components.md).

## Calculations (`lib/calculations.ts`)

| Function | Formula | Notes |
|----------|---------|-------|
| `estimated1RM(weight, reps)` | **Epley**: `weight × (1 + reps/30)`, rounded to 0.1 | `reps===1` → weight; non-positive inputs → 0 |
| `volume(weight, reps)` | `weight × reps` | |
| `totalVolume(sets)` | Σ `volume` | session volume for an exercise |
| `bestEstimated1RM(sets)` | `max(estimated1RM)` across sets | 0 for empty input |

Estimated 1RM is the primary progress metric — it normalizes "5×100kg" vs "8×90kg" onto one comparable number, which is what the `/progress` sparklines and charts trend over time.

## Double progression (`lib/progression.ts`)

**Double progression** = at a fixed weight, work up the rep range; once you hit the top of the range across all sets, add weight and drop back to the bottom.

### `getProgression(lastSessionSets, config, isUpperBody, targetRir=2)`

Inputs: the sets from the **last** session of this exercise, the prescribed `{repRangeMin, repRangeMax}`, whether it's an upper-body lift, and the program's target RIR.

Decision logic:

1. **No sets logged** → `not_logged` ("Not logged").
2. Compute:
   - `allHitTop` = every set reached `repRangeMax`.
   - `keptReserve` = every set kept RIR ≥ `targetRir` (sets with **null RIR are treated as meeting the target** — missing data never blocks progression).
3. **`allHitTop && keptReserve`** → `add_weight`. Increment is **+2.5 kg upper / +5 kg lower** body; message `↑ {newWeight} kg`.
4. **`allHitTop` but not enough reserve** (hit the ceiling but closer to failure than target) → `add_reps`, hold the weight: `Hold {weight} kg` — bank a session at this load first.
5. **Otherwise** → `add_reps`: `+ reps @ {weight} kg`.

Return: `{ recommendation, suggestedWeight, message }` where `recommendation ∈ {add_weight, add_reps, deload, not_logged}`.

> The `deload` recommendation type exists in the union but `getProgression` itself doesn't currently emit it — deload is signalled separately via stall detection.

### `getStallCount(sessionHistory, config)`

Counts consecutive recent sessions at the **same weight and no rep improvement** (most-recent first), stopping at the first session that shows progress. Returns 0 with fewer than two sessions. The intent (per the engine's doc comment) is that **3+ stalled sessions → suggest a deload**.

### `isUpperBody(muscleGroup)`

Classifies a muscle group as upper body — used to pick the weight increment. Upper set: `chest, back, shoulders, biceps, triceps`. Everything else (legs, glutes, core, calves, …) is treated as lower body (+5 kg).

## Worked example

Prescription: Bench Press, 4 sets, rep range **5–8**, target RIR **2**, upper body.

| Last session | `allHitTop` | `keptReserve` | Result |
|--------------|:-----------:|:-------------:|--------|
| 4×8 @ 100kg, all RIR ≥ 2 | ✓ | ✓ | `↑ 102.5 kg` (add weight, +2.5 upper) |
| 4×8 @ 100kg, last set RIR 0 | ✓ | ✗ | `Hold 100 kg` |
| 8,8,7,6 @ 100kg | ✗ | — | `+ reps @ 100 kg` |
| nothing logged | — | — | `Not logged` |

## Where it surfaces

- **`/progress`** ([`data/progress.ts`](data-layer.md)) — runs `getProgression` per exercise and shows the `message` in the "Next move" column, alongside the e1RM sparkline/trend.
- **Workout logging** ([`session-detail.tsx`](components.md)) — uses last-session data + progression to suggest a starting weight for each exercise.
