import { headers } from "next/headers";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  trainerApplications,
  trainers,
  trainerClients,
  programs,
  sessions,
  sessionSets,
  programDays,
  programExercises,
  exercises,
  coachNotes,
} from "@/db/schema";
import { user } from "@/db/auth-schema";
import { auth, requireTrainer, requireUserId } from "@/lib/auth";
import { generateInviteCode } from "@/lib/invite";
import { getProgramById } from "@/data/programs";
import { getActualVolumeByMuscle, type MuscleVolume } from "@/data/progress";

export type TrainerApplication = typeof trainerApplications.$inferSelect;

/**
 * The current user's trainer status: their role plus their latest trainer
 * application (newest first), or null if they've never applied. Drives the
 * state-aware /become-a-trainer page.
 */
export async function getMyTrainerApplication(): Promise<{
  role: string | null;
  application: TrainerApplication | null;
}> {
  const uid = await requireUserId();

  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role ?? null;

  const [application] = await db
    .select()
    .from(trainerApplications)
    .where(eq(trainerApplications.userId, uid))
    .orderBy(desc(trainerApplications.createdAt))
    .limit(1);

  return { role, application: application ?? null };
}

/**
 * Ensures a `trainers` row exists for `trainerId`, returning its invite code.
 * Lazy backfill: a user who became a trainer before the trainers table existed
 * (or whose row was never provisioned) gets a code minted on first read.
 * Generate-and-retry on the unlikely inviteCode unique collision; a concurrent
 * insert that wins the race is absorbed via re-select.
 */
async function ensureTrainerRow(trainerId: string): Promise<{ code: string }> {
  const [existing] = await db
    .select({ code: trainers.inviteCode })
    .from(trainers)
    .where(eq(trainers.userId, trainerId))
    .limit(1);
  if (existing) return { code: existing.code };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    try {
      const [row] = await db
        .insert(trainers)
        .values({ userId: trainerId, inviteCode: code })
        // userId conflict = a concurrent insert already created the row.
        .onConflictDoNothing({ target: trainers.userId })
        .returning({ code: trainers.inviteCode });
      if (row) return { code: row.code };

      // onConflictDoNothing swallowed our insert — the row exists now, re-read.
      const [winner] = await db
        .select({ code: trainers.inviteCode })
        .from(trainers)
        .where(eq(trainers.userId, trainerId))
        .limit(1);
      if (winner) return { code: winner.code };
    } catch (e) {
      // inviteCode collided with another trainer's code — retry a fresh code.
      if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not generate a unique invite code");
}

/**
 * The current trainer's invite code, creating their trainers row (with a unique
 * code) on first access if missing.
 */
export async function getMyTrainerInvite(): Promise<{ code: string }> {
  const trainerId = await requireTrainer();
  return ensureTrainerRow(trainerId);
}

export type ActiveClient = {
  id: string;
  clientId: string;
  name: string | null;
  email: string | null;
  startedAt: Date | null;
};

/** The current trainer's ACTIVE clients (name + email), newest link first. */
export async function getMyActiveClients(): Promise<ActiveClient[]> {
  const trainerId = await requireTrainer();

  return db
    .select({
      id: trainerClients.id,
      clientId: trainerClients.clientId,
      name: user.name,
      email: user.email,
      startedAt: trainerClients.startedAt,
    })
    .from(trainerClients)
    .leftJoin(user, eq(trainerClients.clientId, user.id))
    .where(
      and(
        eq(trainerClients.trainerId, trainerId),
        eq(trainerClients.status, "active"),
      ),
    )
    .orderBy(desc(trainerClients.startedAt));
}

export type MyCoach = {
  trainerId: string;
  name: string | null;
  email: string | null;
  startedAt: Date | null;
};

/** The current user's ACTIVE coach (trainer name/email + since), or null. */
export async function getMyCoach(): Promise<MyCoach | null> {
  const uid = await requireUserId();

  const [row] = await db
    .select({
      trainerId: trainerClients.trainerId,
      name: user.name,
      email: user.email,
      startedAt: trainerClients.startedAt,
    })
    .from(trainerClients)
    .leftJoin(user, eq(trainerClients.trainerId, user.id))
    .where(
      and(
        eq(trainerClients.clientId, uid),
        eq(trainerClients.status, "active"),
      ),
    )
    .limit(1);

  return row ?? null;
}

export type ClientDetail = {
  client: { id: string; name: string | null; email: string | null };
  program: Awaited<ReturnType<typeof getProgramById>> | null;
  volume: MuscleVolume[];
};

/**
 * The detail view for one of the current trainer's ACTIVE clients: their basic
 * identity plus the program this trainer has assigned to them (expanded with
 * days/exercises, same shape as getProgramById), or null if none yet. Returns
 * null if `clientId` isn't an active client of this trainer.
 */
export async function getClientDetail(
  clientId: string,
): Promise<ClientDetail | null> {
  const trainerId = await requireTrainer();

  const [client] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(trainerClients)
    .innerJoin(user, eq(trainerClients.clientId, user.id))
    .where(
      and(
        eq(trainerClients.trainerId, trainerId),
        eq(trainerClients.clientId, clientId),
        eq(trainerClients.status, "active"),
      ),
    )
    .limit(1);
  if (!client) return null;

  const [assigned] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(
      and(
        eq(programs.userId, trainerId),
        eq(programs.assignedClientId, clientId),
      ),
    )
    .limit(1);

  // Active client → this trainer is authorized to see their logged volume.
  const [program, volume] = await Promise.all([
    assigned ? getProgramById(assigned.id) : Promise.resolve(null),
    getActualVolumeByMuscle(clientId, 30),
  ]);

  return { client, program, volume };
}

/** Throws unless `clientId` is an ACTIVE client of `trainerId`. */
async function assertActiveClient(trainerId: string, clientId: string) {
  const [link] = await db
    .select({ id: trainerClients.id })
    .from(trainerClients)
    .where(
      and(
        eq(trainerClients.trainerId, trainerId),
        eq(trainerClients.clientId, clientId),
        eq(trainerClients.status, "active"),
      ),
    )
    .limit(1);
  if (!link) throw new Error("Not an active client");
}

export type ClientSessionRow = {
  id: string;
  date: string;
  status: string;
  dayName: string;
  dayCode: string;
  setCount: number;
};

/**
 * Recent workouts (with logged-set counts) for one of the current trainer's
 * ACTIVE clients, newest first. Read-only monitoring — guarded by the active
 * link, throws otherwise.
 */
export async function getClientRecentSessions(
  clientId: string,
  limit = 20,
): Promise<ClientSessionRow[]> {
  const trainerId = await requireTrainer();
  await assertActiveClient(trainerId, clientId);

  return db
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
    .where(eq(sessions.userId, clientId))
    .groupBy(sessions.id, programDays.name, programDays.dayCode)
    .orderBy(desc(sessions.date))
    .limit(limit);
}

export type ClientSessionDetail = Awaited<
  ReturnType<typeof getClientSessionDetail>
>;

/**
 * Read-only detail of one of an active client's sessions: the day's plan plus
 * every logged set. Guarded by the active link; returns null if the session
 * isn't this client's.
 */
export async function getClientSessionDetail(
  clientId: string,
  sessionId: string,
) {
  const trainerId = await requireTrainer();
  await assertActiveClient(trainerId, clientId);

  const [session] = await db
    .select({
      id: sessions.id,
      date: sessions.date,
      status: sessions.status,
      notes: sessions.notes,
      programDayId: sessions.programDayId,
      dayName: programDays.name,
      dayCode: programDays.dayCode,
    })
    .from(sessions)
    .innerJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, clientId)))
    .limit(1);
  if (!session) return null;

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
      supersetGroup: programExercises.supersetGroup,
    })
    .from(programExercises)
    .innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
    .where(eq(programExercises.programDayId, session.programDayId))
    .orderBy(asc(programExercises.sortOrder));

  const loggedSets = await db
    .select()
    .from(sessionSets)
    .where(eq(sessionSets.sessionId, sessionId))
    .orderBy(asc(sessionSets.exerciseId), asc(sessionSets.setNumber));

  return { ...session, plan, loggedSets };
}

export type CoachNote = {
  id: string;
  body: string;
  createdAt: Date | null;
  sessionId: string | null;
  sessionDayName: string | null;
  sessionDate: string | null;
};

/** All coaching notes this trainer has written about an active client, newest first. */
export async function getClientNotes(clientId: string): Promise<CoachNote[]> {
  const trainerId = await requireTrainer();
  await assertActiveClient(trainerId, clientId);

  return db
    .select({
      id: coachNotes.id,
      body: coachNotes.body,
      createdAt: coachNotes.createdAt,
      sessionId: coachNotes.sessionId,
      sessionDayName: programDays.name,
      sessionDate: sessions.date,
    })
    .from(coachNotes)
    .leftJoin(sessions, eq(coachNotes.sessionId, sessions.id))
    .leftJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(
      and(
        eq(coachNotes.trainerId, trainerId),
        eq(coachNotes.clientId, clientId),
      ),
    )
    .orderBy(desc(coachNotes.createdAt));
}

/** This trainer's notes left on one specific client workout, newest first. */
export async function getClientSessionNotes(
  clientId: string,
  sessionId: string,
): Promise<Pick<CoachNote, "id" | "body" | "createdAt">[]> {
  const trainerId = await requireTrainer();
  await assertActiveClient(trainerId, clientId);

  return db
    .select({
      id: coachNotes.id,
      body: coachNotes.body,
      createdAt: coachNotes.createdAt,
    })
    .from(coachNotes)
    .where(
      and(
        eq(coachNotes.trainerId, trainerId),
        eq(coachNotes.clientId, clientId),
        eq(coachNotes.sessionId, sessionId),
      ),
    )
    .orderBy(desc(coachNotes.createdAt));
}

export type MyCoachNote = CoachNote & { trainerName: string | null };

/** Coaching notes addressed to the current user (from their coach), newest first. */
export async function getMyCoachNotes(): Promise<MyCoachNote[]> {
  const uid = await requireUserId();

  return db
    .select({
      id: coachNotes.id,
      body: coachNotes.body,
      createdAt: coachNotes.createdAt,
      trainerName: user.name,
      sessionId: coachNotes.sessionId,
      sessionDayName: programDays.name,
      sessionDate: sessions.date,
    })
    .from(coachNotes)
    .leftJoin(user, eq(coachNotes.trainerId, user.id))
    .leftJoin(sessions, eq(coachNotes.sessionId, sessions.id))
    .leftJoin(programDays, eq(sessions.programDayId, programDays.id))
    .where(eq(coachNotes.clientId, uid))
    .orderBy(desc(coachNotes.createdAt));
}

/**
 * Looks up a trainer by their invite code (case-insensitive, trimmed). No auth:
 * powers the public /join/[code] invite landing. Returns { trainerId, name }.
 */
export async function getTrainerByCode(
  code: string,
): Promise<{ trainerId: string; name: string | null } | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const [row] = await db
    .select({ trainerId: trainers.userId, name: user.name })
    .from(trainers)
    .leftJoin(user, eq(trainers.userId, user.id))
    .where(eq(trainers.inviteCode, normalized))
    .limit(1);

  return row ?? null;
}
