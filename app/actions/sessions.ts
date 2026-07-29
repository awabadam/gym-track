"use server";

import { db } from "@/db";
import {
  sessions,
  sessionSets,
  programDays,
  programs,
  trainerClients,
} from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parse, idSchema, startPastSessionSchema, setValuesSchema } from "@/lib/validation";
import { createNotification, getDisplayName } from "@/data/notifications";

/** Throws unless the session exists and belongs to the current user. */
async function assertSessionOwned(sessionId: string, uid: string) {
  const [owned] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)))
    .limit(1);
  if (!owned) throw new Error("Not found");
}

/**
 * Throws unless the program day belongs to a program FOLLOWABLE by the current
 * user — one they own, or one a coach assigned to them. Lets a client start/log
 * a session from a coach-assigned program while still blocking strangers' days.
 */
async function assertProgramDayOwned(programDayId: string, uid: string) {
  const [owned] = await db
    .select({ id: programDays.id })
    .from(programDays)
    .innerJoin(programs, eq(programDays.programId, programs.id))
    .where(
      and(
        eq(programDays.id, programDayId),
        or(eq(programs.userId, uid), eq(programs.assignedClientId, uid))
      )
    )
    .limit(1);
  if (!owned) throw new Error("Not found");
}

export async function startSession(programDayId: string) {
  const uid = await requireUserId();
  programDayId = parse(idSchema, programDayId);
  await assertProgramDayOwned(programDayId, uid);
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

  // Invalidate the shared (app) layout — the header's Resume/Start affordance
  // and the sidebar footer both depend on getInProgressSession() and are
  // rendered by that layout, so a path-only revalidate wouldn't reach them.
  revalidatePath("/", "layout");
  redirect(`/workout/${session.id}`);
}

export async function startPastSession(programDayId: string, date: string) {
  const uid = await requireUserId();
  ({ programDayId, date } = parse(startPastSessionSchema, { programDayId, date }));
  await assertProgramDayOwned(programDayId, uid);

  const today = new Date().toISOString().split("T")[0];
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

  revalidatePath("/", "layout");
  redirect(`/workout/${session.id}`);
}

export async function cancelSession(sessionId: string) {
  const uid = await requireUserId();
  // Discard a session (e.g. started by mistake). Sets cascade-delete.
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));

  revalidatePath("/");
  revalidatePath("/log");
  redirect("/");
}

export async function completeSession(sessionId: string) {
  const uid = await requireUserId();
  await db
    .update(sessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));

  // If this user has an active coach, let the coach know they trained.
  const [link] = await db
    .select({ trainerId: trainerClients.trainerId })
    .from(trainerClients)
    .where(
      and(
        eq(trainerClients.clientId, uid),
        eq(trainerClients.status, "active"),
      ),
    )
    .limit(1);
  if (link) {
    const [day] = await db
      .select({ name: programDays.name })
      .from(sessions)
      .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);
    await createNotification({
      userId: link.trainerId,
      type: "workout_logged",
      title: `${await getDisplayName(uid)} logged a workout`,
      body: day?.name ?? undefined,
      linkPath: `/clients/${uid}/sessions/${sessionId}`,
    });
  }

  revalidatePath("/");
  revalidatePath("/log");
  revalidatePath("/progress");
  // Land on the post-workout summary (peak-end), not the plain history list.
  redirect(`/workout/${sessionId}/done`);
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
  ({ weight, reps, rir } = parse(setValuesSchema, { weight, reps, rir }));

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
  ({ weight, reps, rir } = parse(setValuesSchema, { weight, reps, rir }));
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
