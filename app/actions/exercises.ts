"use server";

import { db } from "@/db";
import { exercises, programExercises, sessionSets } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createExercise(formData: FormData) {
  const name = formData.get("name") as string;
  const muscleGroup = formData.get("muscleGroup") as string;
  const type = formData.get("type") as string;
  const notes = formData.get("notes") as string;

  await db.insert(exercises).values({
    name,
    muscleGroup: muscleGroup || null,
    type: type || null,
    notes: notes || null,
  });

  revalidatePath("/exercises");
}

export async function updateExercise(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const muscleGroup = formData.get("muscleGroup") as string;
  const type = formData.get("type") as string;
  const notes = formData.get("notes") as string;

  await db
    .update(exercises)
    .set({
      name,
      muscleGroup: muscleGroup || null,
      type: type || null,
      notes: notes || null,
    })
    .where(eq(exercises.id, id));

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
}

export async function deleteExercise(id: string) {
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

  await db.delete(exercises).where(eq(exercises.id, id));
  revalidatePath("/exercises");
}
