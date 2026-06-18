import { db } from "@/db";
import { exercises, sessionSets, sessions, programExercises, programDays, programs } from "@/db/schema";
import { asc, desc, eq, and, count, max, sql, ilike, or } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";

export async function getExercises({
  search,
  muscleGroup,
  limit = 20,
  offset = 0,
}: {
  search?: string;
  muscleGroup?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const conditions = [];
  if (search) {
    conditions.push(ilike(exercises.name, `%${search}%`));
  }
  if (muscleGroup) {
    conditions.push(eq(exercises.muscleGroup, muscleGroup));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(exercises)
      .where(where)
      .orderBy(asc(exercises.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(exercises).where(where),
  ]);

  return { rows, total };
}

/** Get all exercises (no pagination, for selects/dropdowns) */
export async function getAllExercises() {
  return db.select().from(exercises).orderBy(asc(exercises.name));
}

/** Get distinct muscle groups */
export async function getMuscleGroups(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ muscleGroup: exercises.muscleGroup })
    .from(exercises)
    .where(sql`${exercises.muscleGroup} is not null`)
    .orderBy(asc(exercises.muscleGroup));
  return rows.map((r) => r.muscleGroup!);
}

export async function getExerciseById(id: string) {
  return db.query.exercises.findFirst({
    where: (e, { eq }) => eq(e.id, id),
  });
}

/** Get all sets ever logged for an exercise, grouped by session */
export async function getExerciseHistory(exerciseId: string) {
  const uid = await requireUserId();
  const rows = await db
    .select({
      sessionId: sessions.id,
      date: sessions.date,
      dayName: programDays.name,
      setNumber: sessionSets.setNumber,
      weight: sessionSets.weight,
      reps: sessionSets.reps,
      rir: sessionSets.rir,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(
      and(
        eq(sessions.userId, uid),
        eq(sessionSets.exerciseId, exerciseId),
        eq(sessions.status, "completed")
      )
    )
    .orderBy(desc(sessions.date), asc(sessionSets.setNumber));

  // Group by session
  const grouped = new Map<
    string,
    {
      sessionId: string;
      date: string;
      dayName: string;
      sets: { setNumber: number; weight: number; reps: number; rir: number | null }[];
    }
  >();

  for (const row of rows) {
    if (!grouped.has(row.sessionId)) {
      grouped.set(row.sessionId, {
        sessionId: row.sessionId,
        date: row.date,
        dayName: row.dayName,
        sets: [],
      });
    }
    grouped.get(row.sessionId)!.sets.push({
      setNumber: row.setNumber,
      weight: row.weight,
      reps: row.reps,
      rir: row.rir,
    });
  }

  return Array.from(grouped.values());
}

/** Get aggregate stats for an exercise */
export async function getExerciseStats(exerciseId: string) {
  const uid = await requireUserId();
  const [stats] = await db
    .select({
      totalSets: count(),
      maxWeight: max(sessionSets.weight),
      maxReps: max(sessionSets.reps),
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, uid),
        eq(sessionSets.exerciseId, exerciseId),
        eq(sessions.status, "completed")
      )
    );

  // Count distinct sessions
  const sessionRows = await db
    .select({
      total: sql<number>`count(distinct ${sessions.id})`.as("total"),
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, uid),
        eq(sessionSets.exerciseId, exerciseId),
        eq(sessions.status, "completed")
      )
    );

  // Get the user's programs this exercise is used in
  const programUsage = await db
    .select({
      programName: programs.name,
      dayName: programDays.name,
    })
    .from(programExercises)
    .innerJoin(programDays, eq(programExercises.programDayId, programDays.id))
    .innerJoin(programs, eq(programDays.programId, programs.id))
    .where(and(eq(programs.userId, uid), eq(programExercises.exerciseId, exerciseId)));

  return {
    totalSets: stats.totalSets,
    totalSessions: sessionRows[0]?.total ?? 0,
    maxWeight: stats.maxWeight,
    maxReps: stats.maxReps,
    programs: programUsage,
  };
}
