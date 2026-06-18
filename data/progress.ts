import { db } from "@/db";
import { sessionSets, sessions, programExercises, exercises, programDays } from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { bestEstimated1RM } from "@/lib/calculations";
import { getProgression, isUpperBody } from "@/lib/progression";
import { requireUserId } from "@/lib/auth";

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  repRange: string;
  bestE1RM: number;
  lastWeight: number;
  lastLowestReps: number;
  recommendation: string;
  /** Estimated 1RM per session, oldest → newest (for sparkline trend) */
  series: { date: string; e1rm: number }[];
}

export async function getProgressForProgram(
  programId: string,
  targetRir: number = 2
): Promise<ExerciseProgress[]> {
  const uid = await requireUserId();
  // Get all exercises in this program
  const programExs = await db
    .select({
      exerciseId: programExercises.exerciseId,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      repRangeMin: programExercises.repRangeMin,
      repRangeMax: programExercises.repRangeMax,
      programDayId: programExercises.programDayId,
    })
    .from(programExercises)
    .innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
    .innerJoin(programDays, eq(programExercises.programDayId, programDays.id))
    .where(eq(programDays.programId, programId))
    .orderBy(asc(exercises.name));

  // Deduplicate exercises (same exercise might appear in multiple days)
  const seen = new Set<string>();
  const uniqueExs = programExs.filter((e) => {
    if (seen.has(e.exerciseId)) return false;
    seen.add(e.exerciseId);
    return true;
  });

  const results: ExerciseProgress[] = [];

  for (const ex of uniqueExs) {
    // Get all sets for this exercise from completed sessions
    const allSets = await db
      .select({
        weight: sessionSets.weight,
        reps: sessionSets.reps,
        rir: sessionSets.rir,
        date: sessions.date,
        setNumber: sessionSets.setNumber,
      })
      .from(sessionSets)
      .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.userId, uid),
          eq(sessionSets.exerciseId, ex.exerciseId),
          eq(sessions.status, "completed")
        )
      )
      .orderBy(desc(sessions.date), asc(sessionSets.setNumber));

    if (allSets.length === 0) {
      results.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        muscleGroup: ex.muscleGroup,
        repRange: `${ex.repRangeMin}-${ex.repRangeMax}`,
        bestE1RM: 0,
        lastWeight: 0,
        lastLowestReps: 0,
        recommendation: "Not logged",
        series: [],
      });
      continue;
    }

    const e1rm = bestEstimated1RM(allSets);

    // Estimated 1RM per session date, oldest → newest
    const byDate = new Map<string, { weight: number; reps: number }[]>();
    for (const s of allSets) {
      if (!byDate.has(s.date)) byDate.set(s.date, []);
      byDate.get(s.date)!.push({ weight: s.weight, reps: s.reps });
    }
    const series = [...byDate.entries()]
      .map(([date, sets]) => ({ date, e1rm: bestEstimated1RM(sets) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Last session sets
    const lastDate = allSets[0].date;
    const lastSets = allSets.filter((s) => s.date === lastDate);
    const lastWeight = lastSets[0].weight;
    const lastLowestReps = Math.min(...lastSets.map((s) => s.reps));

    const progression = getProgression(
      lastSets.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
      { repRangeMin: ex.repRangeMin, repRangeMax: ex.repRangeMax },
      isUpperBody(ex.muscleGroup),
      targetRir
    );

    results.push({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      muscleGroup: ex.muscleGroup,
      repRange: `${ex.repRangeMin}-${ex.repRangeMax}`,
      bestE1RM: e1rm,
      lastWeight,
      lastLowestReps,
      recommendation: progression.message,
      series,
    });
  }

  return results;
}
