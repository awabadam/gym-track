import { db } from "@/db";
import { programs, programDays, programExercises, exercises } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";

export async function getPrograms() {
  const uid = await requireUserId();
  return db
    .select()
    .from(programs)
    .where(eq(programs.userId, uid))
    .orderBy(asc(programs.name));
}

export async function getProgramBySlug(slug: string) {
  const uid = await requireUserId();
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a }) => a(e(p.slug, slug), e(p.userId, uid)),
  });
  if (!program) return null;
  return getProgramById(program.id);
}

export async function getProgramById(id: string) {
  const uid = await requireUserId();
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a }) => a(e(p.id, id), e(p.userId, uid)),
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

  return { ...program, days: daysWithExercises };
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
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a }) => a(e(p.isActive, true), e(p.userId, uid)),
  });
  if (!program) return null;
  return getProgramById(program.id);
}
