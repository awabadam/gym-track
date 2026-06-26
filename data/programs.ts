import { db } from "@/db";
import { programs, programDays, programExercises, exercises } from "@/db/schema";
import { eq, asc, and, or, isNull, sql } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";

/**
 * SQL predicate for a user's OWN program surface: their unassigned programs,
 * plus programs a coach assigned TO them. Deliberately excludes programs the
 * user (as a trainer) authored FOR other clients — those have userId = me but
 * assignedClientId set, and live only in the coach console, never the user's
 * own /programs list or active-program selection.
 */
function followableByMe(uid: string) {
  return or(
    and(eq(programs.userId, uid), isNull(programs.assignedClientId)),
    eq(programs.assignedClientId, uid),
  );
}

export async function getPrograms() {
  const uid = await requireUserId();
  const rows = await db
    .select()
    .from(programs)
    .where(followableByMe(uid))
    // Owned programs first (assigned ones sort after), then by name.
    .orderBy(asc(sql`case when ${programs.userId} = ${uid} then 0 else 1 end`), asc(programs.name));

  return rows.map((p) => ({
    ...p,
    canEdit: p.userId === uid,
    isAssigned: p.assignedClientId === uid && p.userId !== uid,
  }));
}

export async function getProgramBySlug(slug: string) {
  const uid = await requireUserId();
  const matches = await db
    .select()
    .from(programs)
    .where(and(eq(programs.slug, slug), followableByMe(uid)));
  if (matches.length === 0) return null;

  // If both an owned and an assigned program share a slug, prefer the owned one.
  const program =
    matches.find((p) => p.userId === uid) ?? matches[0];

  return getProgramById(program.id);
}

export async function getProgramById(id: string) {
  const uid = await requireUserId();
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a, or: o }) =>
      a(e(p.id, id), o(e(p.userId, uid), e(p.assignedClientId, uid))),
  });
  if (!program) return null;

  const days = await db
    .select()
    .from(programDays)
    .where(eq(programDays.programId, id))
    .orderBy(asc(programDays.sortOrder));

  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const exs = await db
        .select({
          id: programExercises.id,
          exerciseId: programExercises.exerciseId,
          exerciseName: exercises.name,
          muscleGroup: exercises.muscleGroup,
          primaryMuscle: exercises.primaryMuscle,
          secondaryMuscles: exercises.secondaryMuscles,
          exerciseType: exercises.type,
          sets: programExercises.sets,
          repRangeMin: programExercises.repRangeMin,
          repRangeMax: programExercises.repRangeMax,
          sortOrder: programExercises.sortOrder,
          notes: programExercises.notes,
          supersetGroup: programExercises.supersetGroup,
        })
        .from(programExercises)
        .innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
        .where(eq(programExercises.programDayId, day.id))
        .orderBy(asc(programExercises.sortOrder));

      return { ...day, exercises: exs };
    })
  );

  return {
    ...program,
    canEdit: program.userId === uid,
    isAssigned: program.assignedClientId === uid && program.userId !== uid,
    days: daysWithExercises,
  };
}

export async function getAllProgramDays() {
  const uid = await requireUserId();
  return db
    .select({
      id: programDays.id,
      name: programDays.name,
      dayCode: programDays.dayCode,
      programName: programs.name,
    })
    .from(programDays)
    .innerJoin(programs, eq(programDays.programId, programs.id))
    .where(eq(programs.userId, uid))
    .orderBy(asc(programs.name), asc(programDays.sortOrder));
}

export async function getActiveProgram() {
  const uid = await requireUserId();
  // The program the user FOLLOWS: their own active program (NOT one they
  // authored for a client), or the active program assigned to them by a coach.
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a, or: o, isNull: n }) =>
      a(
        e(p.isActive, true),
        o(
          a(e(p.userId, uid), n(p.assignedClientId)),
          e(p.assignedClientId, uid)
        )
      ),
    // setActiveProgram keeps at most one active across the follow-set, but order
    // deterministically (coach-assigned first) just in case two are ever active.
    orderBy: (p, { desc }) => desc(p.assignedClientId),
  });
  if (!program) return null;
  return getProgramById(program.id);
}
