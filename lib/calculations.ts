/** Epley formula: estimated 1RM from weight and reps */
export function estimated1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Volume = weight × reps */
export function volume(weight: number, reps: number): number {
  return weight * reps;
}

/** Total session volume for an exercise */
export function totalVolume(
  sets: { weight: number; reps: number }[]
): number {
  return sets.reduce((sum, s) => sum + volume(s.weight, s.reps), 0);
}

/** Best estimated 1RM across a set of logged sets */
export function bestEstimated1RM(
  sets: { weight: number; reps: number }[]
): number {
  if (sets.length === 0) return 0;
  return Math.max(...sets.map((s) => estimated1RM(s.weight, s.reps)));
}
