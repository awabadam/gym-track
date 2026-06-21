"use server";

import { db } from "@/db";
import { exercises, programExercises, sessionSets } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseForm, exerciseSchema } from "@/lib/validation";

/**
 * Throws unless the exercise exists and is owned by the current user. Shared
 * system exercises (userId IS NULL) are owned by no one and cannot be mutated.
 */
async function assertExerciseOwned(id: string, uid: string) {
  const [owned] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, id), eq(exercises.userId, uid)))
    .limit(1);
  if (!owned) throw new Error("Not found");
}

export async function createExercise(formData: FormData) {
  const uid = await requireUserId();
  const data = parseForm(exerciseSchema, formData);

  await db.insert(exercises).values({ userId: uid, ...data });

  revalidatePath("/exercises");
}

export async function updateExercise(id: string, formData: FormData) {
  const uid = await requireUserId();
  await assertExerciseOwned(id, uid);
  const data = parseForm(exerciseSchema, formData);

  await db
    .update(exercises)
    .set(data)
    .where(and(eq(exercises.id, id), eq(exercises.userId, uid)));

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
}

export async function deleteExercise(id: string) {
  const uid = await requireUserId();
  await assertExerciseOwned(id, uid);

  // Check if exercise is used in any programs
  const [programUsage] = await db
    .select({ total: count() })
    .from(programExercises)
    .where(eq(programExercises.exerciseId, id));

  if (programUsage.total > 0) {
    throw new Error(
      `Cannot delete: exercise is used in ${programUsage.total} program(s). Remove it from all programs first.`
    );
  }

  // Check if exercise has logged sets
  const [setUsage] = await db
    .select({ total: count() })
    .from(sessionSets)
    .where(eq(sessionSets.exerciseId, id));

  if (setUsage.total > 0) {
    throw new Error(
      `Cannot delete: exercise has ${setUsage.total} logged set(s). Historical data would be lost.`
    );
  }

  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  revalidatePath("/exercises");
}
