export interface SetData {
  weight: number;
  reps: number;
  rir: number | null;
}

export interface ExerciseConfig {
  repRangeMin: number;
  repRangeMax: number;
}

export type Recommendation =
  | "add_weight"
  | "add_reps"
  | "deload"
  | "not_logged";

export interface ProgressionResult {
  recommendation: Recommendation;
  suggestedWeight: number;
  message: string;
}

/**
 * Double progression engine.
 *
 * Rules:
 * 1. If all sets hit the TOP of the rep range → add weight, drop to bottom of range
 * 2. Otherwise → keep weight, push for more reps
 * 3. If stalled 3+ sessions → suggest deload
 *
 * Weight increments:
 * - Upper body: +1.25–2.5 kg
 * - Lower body: +2.5–5 kg
 */
export function getProgression(
  lastSessionSets: SetData[],
  config: ExerciseConfig,
  isUpperBody: boolean,
  targetRir: number = 2
): ProgressionResult {
  if (lastSessionSets.length === 0) {
    return {
      recommendation: "not_logged",
      suggestedWeight: 0,
      // First time on this lift: give guidance instead of dead "Not logged"
      // noise under every exercise on a fresh program.
      message: "First time — find a weight you can control for the full range",
    };
  }

  const lastWeight = lastSessionSets[0].weight;
  const allHitTop = lastSessionSets.every((s) => s.reps >= config.repRangeMax);

  // RIR-aware double progression: only add load once you can hit the top of the
  // rep range while still keeping at least your target reps in reserve. Sets
  // logged without an RIR value are treated as meeting the target (don't block
  // progression on missing data).
  const keptReserve = lastSessionSets.every(
    (s) => s.rir == null || s.rir >= targetRir
  );

  if (allHitTop && keptReserve) {
    const increment = isUpperBody ? 2.5 : 5;
    const newWeight = lastWeight + increment;
    return {
      recommendation: "add_weight",
      suggestedWeight: newWeight,
      message: `↑ ${newWeight} kg`,
    };
  }

  if (allHitTop) {
    // Hit the ceiling of the range, but closer to failure than target — hold
    // the weight and bank a session at this load before progressing.
    return {
      recommendation: "add_reps",
      suggestedWeight: lastWeight,
      message: `Hold ${lastWeight} kg`,
    };
  }

  return {
    recommendation: "add_reps",
    suggestedWeight: lastWeight,
    message: `+ reps @ ${lastWeight} kg`,
  };
}

/**
 * Check if an exercise is stalled: no progress for N consecutive sessions.
 * Returns the number of consecutive sessions at the same weight+reps.
 */
export function getStallCount(
  sessionHistory: { sets: SetData[] }[]
): number {
  if (sessionHistory.length < 2) return 0;

  let stallCount = 0;
  const latest = sessionHistory[0];
  const latestMaxReps = Math.max(...latest.sets.map((s) => s.reps));
  const latestWeight = latest.sets[0]?.weight ?? 0;

  for (let i = 1; i < sessionHistory.length; i++) {
    const session = sessionHistory[i];
    const maxReps = Math.max(...session.sets.map((s) => s.reps));
    const weight = session.sets[0]?.weight ?? 0;

    if (weight === latestWeight && maxReps >= latestMaxReps) {
      stallCount++;
    } else {
      break;
    }
  }

  return stallCount;
}

/** Upper body muscle groups */
const UPPER_MUSCLES = new Set([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
]);

export function isUpperBody(muscleGroup: string | null): boolean {
  return UPPER_MUSCLES.has(muscleGroup ?? "");
}
