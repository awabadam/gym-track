import { db } from "@/db";
import {
  sessions,
  sessionSets,
  programDays,
  programs,
  exercises,
  programExercises,
} from "@/db/schema";
import { eq, desc, asc, and, sql, count, gte, lte, max, inArray } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";

export async function getRecentSessions(limit = 10) {
  const uid = await requireUserId();
  const rows = await db
    .select({
      id: sessions.id,
      date: sessions.date,
      status: sessions.status,
      dayName: programDays.name,
      dayCode: programDays.dayCode,
    })
    .from(sessions)
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(eq(sessions.userId, uid))
    .orderBy(desc(sessions.date))
    .limit(limit);

  return rows;
}

export async function getSessionById(sessionId: string) {
  const uid = await requireUserId();
  const session = await db
    .select({
      id: sessions.id,
      date: sessions.date,
      status: sessions.status,
      notes: sessions.notes,
      programDayId: sessions.programDayId,
      dayName: programDays.name,
      dayCode: programDays.dayCode,
      programId: programDays.programId,
      targetRir: programs.targetRir,
    })
    .from(sessions)
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .innerJoin(programs, eq(programDays.programId, programs.id))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)))
    .then((rows) => rows[0] ?? null);

  if (!session) return null;

  // Get program exercises for this day (the plan)
  const plan = await db
    .select({
      id: programExercises.id,
      exerciseId: programExercises.exerciseId,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      sets: programExercises.sets,
      repRangeMin: programExercises.repRangeMin,
      repRangeMax: programExercises.repRangeMax,
      sortOrder: programExercises.sortOrder,
      notes: programExercises.notes,
      supersetGroup: programExercises.supersetGroup,
    })
    .from(programExercises)
    .innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
    .where(eq(programExercises.programDayId, session.programDayId))
    .orderBy(asc(programExercises.sortOrder));

  // Get logged sets
  const loggedSets = await db
    .select()
    .from(sessionSets)
    .where(eq(sessionSets.sessionId, sessionId))
    .orderBy(asc(sessionSets.exerciseId), asc(sessionSets.setNumber));

  return { ...session, plan, loggedSets };
}

/** Get last session's sets for a specific exercise (for progression engine) */
export async function getLastSessionSets(
  exerciseId: string,
  programDayId: string,
  excludeSessionId?: string
) {
  const uid = await requireUserId();
  const query = db
    .select({
      weight: sessionSets.weight,
      reps: sessionSets.reps,
      rir: sessionSets.rir,
      setNumber: sessionSets.setNumber,
      sessionDate: sessions.date,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, uid),
        eq(sessionSets.exerciseId, exerciseId),
        eq(sessions.programDayId, programDayId),
        eq(sessions.status, "completed")
      )
    )
    .orderBy(desc(sessions.date), asc(sessionSets.setNumber));

  const rows = await query;
  if (rows.length === 0) return [];

  // Only return sets from the most recent session
  const latestDate = rows[0].sessionDate;
  return rows
    .filter((r) => r.sessionDate === latestDate)
    .map((r) => ({ weight: r.weight, reps: r.reps, rir: r.rir, setNumber: r.setNumber }));
}

export async function getInProgressSession() {
  const uid = await requireUserId();
  return db
    .select({
      id: sessions.id,
      date: sessions.date,
      dayName: programDays.name,
      dayCode: programDays.dayCode,
    })
    .from(sessions)
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(and(eq(sessions.userId, uid), eq(sessions.status, "in_progress")))
    .then((rows) => rows[0] ?? null);
}

/** Recent sessions with set count per session (for the log page) */
export async function getRecentSessionsWithSetCount({
  limit = 20,
  offset = 0,
}: { limit?: number; offset?: number } = {}) {
  const uid = await requireUserId();
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: sessions.id,
        date: sessions.date,
        status: sessions.status,
        dayName: programDays.name,
        dayCode: programDays.dayCode,
        setCount: count(sessionSets.id),
      })
      .from(sessions)
      .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
      .leftJoin(sessionSets, eq(sessionSets.sessionId, sessions.id))
      .where(eq(sessions.userId, uid))
      .groupBy(sessions.id, programDays.name, programDays.dayCode)
      .orderBy(desc(sessions.date))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(sessions).where(eq(sessions.userId, uid)),
  ]);

  return { rows, total };
}

/** Get sessions for the current week (Mon-Sun) for the weekly overview */
export async function getSessionsForCurrentWeek() {
  const now = new Date();
  // Get Monday of this week (ISO week starts on Monday)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = monday.toISOString().split("T")[0];
  const sundayStr = sunday.toISOString().split("T")[0];

  const uid = await requireUserId();
  const rows = await db
    .select({
      id: sessions.id,
      date: sessions.date,
      status: sessions.status,
      programDayId: sessions.programDayId,
      dayName: programDays.name,
      dayCode: programDays.dayCode,
      scheduledDay: programDays.scheduledDay,
    })
    .from(sessions)
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(
      and(
        eq(sessions.userId, uid),
        gte(sessions.date, mondayStr),
        lte(sessions.date, sundayStr)
      )
    )
    .orderBy(asc(sessions.date));

  return rows;
}

/** Get the best (heaviest) set ever logged for an exercise */
export async function getBestSet(exerciseId: string) {
  const uid = await requireUserId();
  const rows = await db
    .select({
      weight: sessionSets.weight,
      reps: sessionSets.reps,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, uid),
        eq(sessionSets.exerciseId, exerciseId),
        eq(sessions.status, "completed")
      )
    )
    .orderBy(desc(sessionSets.weight), desc(sessionSets.reps))
    .limit(1);

  return rows[0] ?? null;
}

/** Get all sessions in a date range (for calendar view) */
export async function getSessionsInRange(startDate: string, endDate: string) {
  const uid = await requireUserId();
  return db
    .select({
      id: sessions.id,
      date: sessions.date,
      status: sessions.status,
      dayName: programDays.name,
      dayCode: programDays.dayCode,
    })
    .from(sessions)
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(
      and(
        eq(sessions.userId, uid),
        gte(sessions.date, startDate),
        lte(sessions.date, endDate)
      )
    )
    .orderBy(asc(sessions.date));
}

/** Get the last completed session date for each program day in a list of day IDs */
export async function getLastSessionDatePerDay(
  dayIds: string[]
): Promise<Record<string, string>> {
  if (dayIds.length === 0) return {};

  const uid = await requireUserId();
  const rows = await db
    .select({
      programDayId: sessions.programDayId,
      lastDate: max(sessions.date).as("last_date"),
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, uid),
        inArray(sessions.programDayId, dayIds),
        eq(sessions.status, "completed")
      )
    )
    .groupBy(sessions.programDayId);

  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.lastDate) {
      result[row.programDayId] = row.lastDate;
    }
  }
  return result;
}
