"use server";

import { db } from "@/db";
import { programs, programDays, programExercises } from "@/db/schema";
import { eq, asc, and, or, gt, lt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { slugify } from "@/lib/slug";
import { auth, requireUserId, userIsAdmin } from "@/lib/auth";
import {
  parseForm,
  programSchema,
  programDaySchema,
  programExerciseSchema,
  programExerciseUpdateSchema,
} from "@/lib/validation";

/** Throws unless the program exists and belongs to the current user. */
async function assertProgramOwned(programId: string, uid: string) {
  const [owned] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.userId, uid)))
    .limit(1);
  if (!owned) throw new Error("Not found");
}

/**
 * Authorizes editing a program's contents (days/exercises): the owner can edit
 * their own program, and an admin can edit a recommended template (userId IS
 * NULL). Lets the same builder actions/components serve both contexts.
 */
async function assertProgramManageable(programId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) throw new Error("Unauthorized: no signed-in user");

  const [program] = await db
    .select({ userId: programs.userId })
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);
  if (!program) throw new Error("Not found");

  const isOwner = program.userId === user.id;
  const isManagedTemplate = program.userId === null && userIsAdmin(user);
  if (!isOwner && !isManagedTemplate) throw new Error("Not found");
}

/** Revalidate the user-facing, admin, and trainer builder routes for a program. */
function revalidateBuilder(programId: string) {
  revalidatePath(`/programs/${programId}/edit`);
  revalidatePath(`/admin/programs/${programId}/edit`);
  // The trainer builder route is keyed by clientId (not programId), so target
  // the whole /clients subtree to pick up nested-edit changes there too.
  revalidatePath("/clients", "layout");
}

export async function createProgram(formData: FormData) {
  const uid = await requireUserId();
  const { name, description, targetRir } = parseForm(programSchema, formData);
  const slug = slugify(name);

  const [program] = await db
    .insert(programs)
    .values({ userId: uid, name, slug, description, isActive: false, targetRir })
    .returning();

  revalidatePath("/programs");
  redirect(`/programs/${program.slug}/edit`);
}

export async function updateProgram(programId: string, formData: FormData) {
  const uid = await requireUserId();
  await assertProgramOwned(programId, uid);
  const { name, description, targetRir } = parseForm(programSchema, formData);
  const slug = slugify(name);

  await db
    .update(programs)
    .set({ name, slug, description, targetRir })
    .where(and(eq(programs.id, programId), eq(programs.userId, uid)));

  revalidatePath(`/programs/${slug}`);
  revalidatePath("/programs");
  // Also refresh the builder routes (incl. the coach console) so a details
  // edit shows up there, matching the day/exercise mutations.
  revalidateBuilder(programId);
}

export async function deleteProgram(programId: string) {
  const uid = await requireUserId();
  await db
    .delete(programs)
    .where(and(eq(programs.id, programId), eq(programs.userId, uid)));
  revalidatePath("/programs");
  redirect("/programs");
}

export async function setActiveProgram(programId: string) {
  const uid = await requireUserId();
  // Allow activating a program the user FOLLOWS: one they own, or one a coach
  // assigned to them. (They still can't EDIT an assigned program.)
  const [followable] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(
      and(
        eq(programs.id, programId),
        // Only programs the user actually follows — their own unassigned
        // programs or ones assigned TO them. A trainer must NOT be able to flip
        // a program they authored for a client active from their own surface.
        or(
          and(eq(programs.userId, uid), isNull(programs.assignedClientId)),
          eq(programs.assignedClientId, uid)
        )
      )
    )
    .limit(1);
  if (!followable) throw new Error("Not found");

  // Deactivate only the set of programs this user follows — their own
  // (unassigned) programs and programs assigned to them. Do NOT touch programs
  // this user (as a trainer) assigned to OTHER clients.
  await db
    .update(programs)
    .set({ isActive: false })
    .where(
      or(
        and(eq(programs.userId, uid), isNull(programs.assignedClientId)),
        eq(programs.assignedClientId, uid)
      )
    );
  await db
    .update(programs)
    .set({ isActive: true })
    .where(eq(programs.id, programId));

  revalidatePath("/programs");
  revalidatePath("/");
}

export async function addProgramDay(
  programId: string,
  formData: FormData
) {
  await assertProgramManageable(programId);
  const { name, dayCode, scheduledDay } = parseForm(programDaySchema, formData);

  // Get next sort order
  const existing = await db
    .select({ sortOrder: programDays.sortOrder })
    .from(programDays)
    .where(eq(programDays.programId, programId))
    .then((rows) => rows.map((r) => r.sortOrder));

  const nextOrder = existing.length > 0 ? Math.max(...existing) + 1 : 1;

  await db.insert(programDays).values({
    programId,
    name,
    dayCode,
    scheduledDay,
    sortOrder: nextOrder,
  });

  revalidateBuilder(programId);
}

export async function updateProgramDay(dayId: string, programId: string, formData: FormData) {
  await assertProgramManageable(programId);
  const { name, dayCode, scheduledDay } = parseForm(programDaySchema, formData);

  await db
    .update(programDays)
    .set({ name, dayCode, scheduledDay })
    .where(eq(programDays.id, dayId));

  revalidateBuilder(programId);
}

export async function deleteProgramDay(dayId: string, programId: string) {
  await assertProgramManageable(programId);
  await db
    .delete(programDays)
    .where(and(eq(programDays.id, dayId), eq(programDays.programId, programId)));
  revalidateBuilder(programId);
}

export async function addProgramExercise(
  dayId: string,
  programId: string,
  formData: FormData
) {
  await assertProgramManageable(programId);
  const { exerciseId, sets, repRangeMin, repRangeMax, notes, supersetGroup } =
    parseForm(programExerciseSchema, formData);

  const existing = await db
    .select({ sortOrder: programExercises.sortOrder })
    .from(programExercises)
    .where(eq(programExercises.programDayId, dayId))
    .then((rows) => rows.map((r) => r.sortOrder));

  const nextOrder = existing.length > 0 ? Math.max(...existing) + 1 : 1;

  await db.insert(programExercises).values({
    programDayId: dayId,
    exerciseId,
    sets,
    repRangeMin,
    repRangeMax,
    sortOrder: nextOrder,
    notes,
    supersetGroup,
  });

  revalidateBuilder(programId);
}

export async function updateProgramExercise(
  exerciseEntryId: string,
  programId: string,
  formData: FormData
) {
  await assertProgramManageable(programId);
  const { sets, repRangeMin, repRangeMax, notes, supersetGroup } = parseForm(
    programExerciseUpdateSchema,
    formData
  );

  await db
    .update(programExercises)
    .set({ sets, repRangeMin, repRangeMax, notes, supersetGroup })
    .where(eq(programExercises.id, exerciseEntryId));

  revalidateBuilder(programId);
}

export async function deleteProgramExercise(
  exerciseEntryId: string,
  programId: string
) {
  await assertProgramManageable(programId);
  await db
    .delete(programExercises)
    .where(eq(programExercises.id, exerciseEntryId));

  revalidateBuilder(programId);
}

export async function reorderProgramExercise(
  exerciseEntryId: string,
  programId: string,
  direction: "up" | "down"
) {
  await assertProgramManageable(programId);
  const entry = await db.query.programExercises.findFirst({
    where: (pe, { eq: e }) => e(pe.id, exerciseEntryId),
  });
  if (!entry) return;

  const neighbor = await db
    .select()
    .from(programExercises)
    .where(
      and(
        eq(programExercises.programDayId, entry.programDayId),
        direction === "up"
          ? lt(programExercises.sortOrder, entry.sortOrder)
          : gt(programExercises.sortOrder, entry.sortOrder)
      )
    )
    .orderBy(
      direction === "up"
        ? asc(programExercises.sortOrder)
        : asc(programExercises.sortOrder)
    )
    .then((rows) =>
      direction === "up" ? rows[rows.length - 1] : rows[0]
    );

  if (!neighbor) return;

  // Swap sort orders
  await db
    .update(programExercises)
    .set({ sortOrder: neighbor.sortOrder })
    .where(eq(programExercises.id, entry.id));
  await db
    .update(programExercises)
    .set({ sortOrder: entry.sortOrder })
    .where(eq(programExercises.id, neighbor.id));

  revalidateBuilder(programId);
}

export async function duplicateProgramDay(dayId: string, programId: string) {
  await assertProgramManageable(programId);
  const day = await db.query.programDays.findFirst({
    where: (d, { eq: e }) => e(d.id, dayId),
  });
  if (!day) return;

  // Get next sort order
  const existing = await db
    .select({ sortOrder: programDays.sortOrder })
    .from(programDays)
    .where(eq(programDays.programId, programId))
    .then((rows) => rows.map((r) => r.sortOrder));
  const nextOrder = existing.length > 0 ? Math.max(...existing) + 1 : 1;

  const [newDay] = await db
    .insert(programDays)
    .values({
      programId,
      name: `${day.name} (copy)`,
      dayCode: `${day.dayCode}2`,
      scheduledDay: null,
      sortOrder: nextOrder,
    })
    .returning();

  // Copy exercises
  const dayExercises = await db
    .select()
    .from(programExercises)
    .where(eq(programExercises.programDayId, dayId))
    .orderBy(asc(programExercises.sortOrder));

  if (dayExercises.length > 0) {
    await db.insert(programExercises).values(
      dayExercises.map((ex) => ({
        programDayId: newDay.id,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        repRangeMin: ex.repRangeMin,
        repRangeMax: ex.repRangeMax,
        sortOrder: ex.sortOrder,
        notes: ex.notes,
        supersetGroup: ex.supersetGroup,
      }))
    );
  }

  revalidateBuilder(programId);
}

export async function duplicateProgram(programId: string) {
  const uid = await requireUserId();
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a }) => a(e(p.id, programId), e(p.userId, uid)),
  });
  if (!program) return;

  const newName = `${program.name} (copy)`;
  const newSlug = slugify(newName);

  const [newProgram] = await db
    .insert(programs)
    .values({
      userId: uid,
      name: newName,
      slug: newSlug,
      description: program.description,
      isActive: false,
      targetRir: program.targetRir,
    })
    .returning();

  // Copy days and their exercises
  const days = await db
    .select()
    .from(programDays)
    .where(eq(programDays.programId, programId))
    .orderBy(asc(programDays.sortOrder));

  for (const day of days) {
    const [newDay] = await db
      .insert(programDays)
      .values({
        programId: newProgram.id,
        name: day.name,
        dayCode: day.dayCode,
        scheduledDay: day.scheduledDay,
        sortOrder: day.sortOrder,
      })
      .returning();

    const dayExercises = await db
      .select()
      .from(programExercises)
      .where(eq(programExercises.programDayId, day.id))
      .orderBy(asc(programExercises.sortOrder));

    if (dayExercises.length > 0) {
      await db.insert(programExercises).values(
        dayExercises.map((ex) => ({
          programDayId: newDay.id,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          repRangeMin: ex.repRangeMin,
          repRangeMax: ex.repRangeMax,
          sortOrder: ex.sortOrder,
          notes: ex.notes,
          supersetGroup: ex.supersetGroup,
        }))
      );
    }
  }

  revalidatePath("/programs");
  redirect(`/programs/${newSlug}/edit`);
}
