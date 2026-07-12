"use server";

import { db } from "@/db";
import { goals, personalRecords, exercises } from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import {
  parse,
  idSchema,
  oneRepMaxSchema,
  strengthGoalSchema,
} from "@/lib/validation";

/** Throws unless the exercise is shared (system) or owned by the user. */
async function assertExerciseVisible(exerciseId: string, uid: string) {
  const [ex] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(
        eq(exercises.id, exerciseId),
        or(isNull(exercises.userId), eq(exercises.userId, uid))
      )
    )
    .limit(1);
  if (!ex) throw new Error("Not found");
}

/**
 * Log a true (tested) one-rep max — the deliberate, celebrated action. Returns
 * whether it met an active goal so the UI can fanfare appropriately.
 */
export async function logOneRepMax(input: {
  exerciseId: string;
  value: number;
  achievedOn: string;
  note?: string;
}): Promise<{
  value: number;
  previousBest: number | null;
  isNewBest: boolean;
  achievedGoal: boolean;
  goalTarget: number | null;
}> {
  const uid = await requireUserId();
  const data = parse(oneRepMaxSchema, input);
  await assertExerciseVisible(data.exerciseId, uid);

  // Best existing 1RM for this lift, to tell whether this one is a new record.
  const prior = await db
    .select({ value: personalRecords.value })
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.userId, uid),
        eq(personalRecords.exerciseId, data.exerciseId),
        eq(personalRecords.kind, "one_rep_max")
      )
    );
  const previousBest = prior.length
    ? Math.max(...prior.map((r) => r.value))
    : null;
  const isNewBest = previousBest == null || data.value > previousBest;

  await db.insert(personalRecords).values({
    userId: uid,
    exerciseId: data.exerciseId,
    kind: "one_rep_max",
    value: data.value,
    reps: 1,
    achievedOn: data.achievedOn,
    note: data.note,
  });

  // If this 1RM meets an active goal for the lift, mark the goal achieved.
  const [goal] = await db
    .select({ id: goals.id, targetValue: goals.targetValue })
    .from(goals)
    .where(
      and(
        eq(goals.userId, uid),
        eq(goals.type, "strength"),
        eq(goals.status, "active"),
        eq(goals.exerciseId, data.exerciseId)
      )
    )
    .limit(1);

  let achievedGoal = false;
  if (goal && data.value >= goal.targetValue) {
    await db
      .update(goals)
      .set({ status: "achieved", achievedAt: new Date() })
      .where(eq(goals.id, goal.id));
    achievedGoal = true;
  }

  revalidatePath("/goals");
  revalidatePath("/progress");
  return {
    value: data.value,
    previousBest,
    isNewBest,
    achievedGoal,
    goalTarget: goal?.targetValue ?? null,
  };
}

/** Create or update the active 1RM goal for a lift (one active goal per lift). */
export async function setStrengthGoal(input: {
  exerciseId: string;
  targetValue: number;
  targetDate?: string;
}): Promise<void> {
  const uid = await requireUserId();
  const data = parse(strengthGoalSchema, input);
  await assertExerciseVisible(data.exerciseId, uid);

  const [existing] = await db
    .select({ id: goals.id })
    .from(goals)
    .where(
      and(
        eq(goals.userId, uid),
        eq(goals.type, "strength"),
        eq(goals.status, "active"),
        eq(goals.exerciseId, data.exerciseId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(goals)
      .set({ targetValue: data.targetValue, targetDate: data.targetDate })
      .where(eq(goals.id, existing.id));
  } else {
    await db.insert(goals).values({
      userId: uid,
      type: "strength",
      exerciseId: data.exerciseId,
      targetValue: data.targetValue,
      targetDate: data.targetDate,
    });
  }

  revalidatePath("/goals");
}

export async function deleteStrengthGoal(goalId: string): Promise<void> {
  const uid = await requireUserId();
  goalId = parse(idSchema, goalId);
  await db
    .delete(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, uid)));
  revalidatePath("/goals");
}

export async function deleteOneRepMax(recordId: string): Promise<void> {
  const uid = await requireUserId();
  recordId = parse(idSchema, recordId);
  await db
    .delete(personalRecords)
    .where(and(eq(personalRecords.id, recordId), eq(personalRecords.userId, uid)));
  revalidatePath("/goals");
}
