import { db } from "@/db";
import { exercises, programs, programDays, programExercises } from "@/db/schema";
import { asc } from "drizzle-orm";

/** Day definitions for the default MaxGrowth Upper/Lower program. */
const DAY_DATA = [
  { name: "Upper A", dayCode: "UA", scheduledDay: "monday", sortOrder: 1 },
  { name: "Lower A", dayCode: "LA", scheduledDay: "tuesday", sortOrder: 2 },
  { name: "Upper B", dayCode: "UB", scheduledDay: "thursday", sortOrder: 3 },
  { name: "Lower B", dayCode: "LB", scheduledDay: "friday", sortOrder: 4 },
];

const PROGRAM_EXERCISE_DATA = [
  { dayCode: "UA", exercise: "Bench Press", sets: 4, min: 5, max: 8, order: 1 },
  { dayCode: "UA", exercise: "Barbell Row", sets: 4, min: 5, max: 8, order: 2 },
  { dayCode: "UA", exercise: "Overhead Press", sets: 3, min: 6, max: 10, order: 3 },
  { dayCode: "UA", exercise: "Lateral Raise", sets: 3, min: 12, max: 20, order: 4, superset: "A" },
  { dayCode: "UA", exercise: "Triceps Pushdown", sets: 3, min: 10, max: 15, order: 5, superset: "A" },
  { dayCode: "UA", exercise: "Incline Curl", sets: 3, min: 10, max: 15, order: 6 },
  { dayCode: "LA", exercise: "Squat", sets: 4, min: 5, max: 8, order: 1 },
  { dayCode: "LA", exercise: "Leg Press", sets: 3, min: 8, max: 12, order: 2 },
  { dayCode: "LA", exercise: "Romanian Deadlift", sets: 3, min: 8, max: 12, order: 3 },
  { dayCode: "LA", exercise: "Lying Leg Curl", sets: 3, min: 10, max: 15, order: 4 },
  { dayCode: "LA", exercise: "Calf Raise", sets: 4, min: 10, max: 15, order: 5 },
  { dayCode: "LA", exercise: "Hanging Leg Raise", sets: 3, min: 10, max: 15, order: 6 },
  { dayCode: "UB", exercise: "Incline Dumbbell Press", sets: 4, min: 8, max: 12, order: 1 },
  { dayCode: "UB", exercise: "Lat Pulldown", sets: 4, min: 6, max: 10, order: 2 },
  { dayCode: "UB", exercise: "Seated Cable Row", sets: 3, min: 8, max: 12, order: 3 },
  { dayCode: "UB", exercise: "DB Shoulder Press", sets: 3, min: 8, max: 12, order: 4 },
  { dayCode: "UB", exercise: "Face Pull", sets: 3, min: 15, max: 20, order: 5 },
  { dayCode: "UB", exercise: "Hammer Curl", sets: 3, min: 10, max: 15, order: 6 },
  { dayCode: "LB", exercise: "Deadlift", sets: 3, min: 5, max: 8, order: 1 },
  { dayCode: "LB", exercise: "Front Squat", sets: 3, min: 8, max: 12, order: 2 },
  { dayCode: "LB", exercise: "Bulgarian Split Squat", sets: 3, min: 8, max: 12, order: 3 },
  { dayCode: "LB", exercise: "Hip Thrust", sets: 3, min: 8, max: 12, order: 4 },
  { dayCode: "LB", exercise: "Seated Leg Curl", sets: 3, min: 10, max: 15, order: 5 },
  { dayCode: "LB", exercise: "Calf Raise", sets: 4, min: 10, max: 15, order: 6 },
];

/**
 * Creates a personal copy of the default MaxGrowth program for a user, wiring
 * its exercises up to the shared exercise catalog (matched by name). Skips any
 * program exercise whose catalog entry is missing.
 */
export async function seedProgramForUser(userId: string) {
  const catalog = await db.select().from(exercises).orderBy(asc(exercises.name));
  const byName = Object.fromEntries(catalog.map((e) => [e.name, e.id]));

  const [program] = await db
    .insert(programs)
    .values({
      userId,
      name: "Maximal Growth — Upper/Lower 4 Days",
      slug: "maximal-growth-upper-lower-4-days",
      description:
        "Mon UA · Tue LA · Thu UB · Fri LB. ~45 min each. Every muscle trained 2×/week, 10+ sets/week. Double progression.",
      isActive: true,
    })
    .returning();

  const insertedDays = await db
    .insert(programDays)
    .values(DAY_DATA.map((d) => ({ ...d, programId: program.id })))
    .returning();

  const dayByCode = Object.fromEntries(insertedDays.map((d) => [d.dayCode, d.id]));

  const rows = PROGRAM_EXERCISE_DATA.filter((pe) => byName[pe.exercise]).map((pe) => ({
    programDayId: dayByCode[pe.dayCode],
    exerciseId: byName[pe.exercise],
    sets: pe.sets,
    repRangeMin: pe.min,
    repRangeMax: pe.max,
    sortOrder: pe.order,
    supersetGroup: (pe as { superset?: string }).superset ?? null,
  }));

  if (rows.length > 0) {
    await db.insert(programExercises).values(rows);
  }

  return program;
}
