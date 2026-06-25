import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  trainerApplications,
  trainers,
  trainerClients,
  programs,
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
