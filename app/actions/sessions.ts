"use server";

import { db } from "@/db";
import { sessions, sessionSets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";

/** Throws unless the session exists and belongs to the current user. */
async function assertSessionOwned(sessionId: string, uid: string) {
  const [owned] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)))
    .limit(1);
  if (!owned) throw new Error("Not found");
}

export async function startSession(programDayId: string) {
  const uid = await requireUserId();
  const today = new Date().toISOString().split("T")[0];

  const [session] = await db
    .insert(sessions)
    .values({
      userId: uid,
      programDayId,
      date: today,
      status: "in_progress",
    })
    .returning();

  redirect(`/workout/${session.id}`);
}

export async function startPastSession(programDayId: string, date: string) {
  const uid = await requireUserId();
  const today = new Date().toISOString().split("T")[0];

  if (!programDayId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Pick a workout day and a valid date.");
  }
  if (date > today) {
    throw new Error("Date can’t be in the future.");
  }

  const [session] = await db
    .insert(sessions)
    .values({
      userId: uid,
      programDayId,
      date,
      status: "in_progress",
    })
    .returning();

  revalidatePath("/log");
  redirect(`/workout/${session.id}`);
}

export async function cancelSession(sessionId: string) {
  const uid = await requireUserId();
  // Discard a session (e.g. started by mistake). Sets cascade-delete.
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));

  revalidatePath("/");
  revalidatePath("/workout");
  revalidatePath("/log");
  redirect("/workout");
}

export async function completeSession(sessionId: string) {
  const uid = await requireUserId();
  await db
    .update(sessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));

  revalidatePath("/");
  revalidatePath("/log");
  revalidatePath("/progress");
  redirect("/log");
}

export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  rir: number | null
) {
  const uid = await requireUserId();
  await assertSessionOwned(sessionId, uid);

  // Upsert by (session, exercise, set number) so re-saving a set edits it in
  // place instead of inserting a duplicate row.
  const [existing] = await db
    .select({ id: sessionSets.id })
    .from(sessionSets)
    .where(
      and(
        eq(sessionSets.sessionId, sessionId),
        eq(sessionSets.exerciseId, exerciseId),
        eq(sessionSets.setNumber, setNumber)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(sessionSets)
      .set({ weight, reps, rir })
      .where(eq(sessionSets.id, existing.id));
  } else {
    await db
      .insert(sessionSets)
      .values({ sessionId, exerciseId, setNumber, weight, reps, rir });
  }

  revalidatePath(`/workout/${sessionId}`);
  revalidatePath(`/log/${sessionId}`);
}

export async function updateSet(
  setId: string,
  weight: number,
  reps: number,
  rir: number | null
) {
  const uid = await requireUserId();
  // Only update the set if its session belongs to the current user.
  const [owned] = await db
    .select({ id: sessionSets.id })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .where(and(eq(sessionSets.id, setId), eq(sessions.userId, uid)))
    .limit(1);
  if (!owned) throw new Error("Not found");

  await db
    .update(sessionSets)
    .set({ weight, reps, rir })
    .where(eq(sessionSets.id, setId));
}

export async function deleteSet(setId: string, sessionId: string) {
  const uid = await requireUserId();
  await assertSessionOwned(sessionId, uid);

  await db
    .delete(sessionSets)
    .where(and(eq(sessionSets.id, setId), eq(sessionSets.sessionId, sessionId)));
  revalidatePath(`/workout/${sessionId}`);
  revalidatePath(`/log/${sessionId}`);
}

export async function deleteSession(sessionId: string) {
  const uid = await requireUserId();
  // sessionSets cascade on session delete (schema FK onDelete: cascade)
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));
  revalidatePath("/");
  revalidatePath("/log");
  revalidatePath("/progress");
}
