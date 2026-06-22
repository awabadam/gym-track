import { headers } from "next/headers";
import { and, asc, count, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercises, programs, programDays, programExercises } from "@/db/schema";
import { auth, requireAdmin } from "@/lib/auth";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
};

/**
 * Lists users for the admin console. Reads run through the admin plugin so its
 * authorization (caller must be an admin) is enforced server-side; we also call
 * requireAdmin() up front to fail fast / get the current admin id.
 */
export async function listUsersForAdmin(opts: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ users: AdminUser[]; total: number; currentUserId: string }> {
  const currentUserId = await requireAdmin();

  const res = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: opts.limit,
      offset: opts.offset,
      sortBy: "createdAt",
      sortDirection: "desc",
      ...(opts.search
        ? {
            searchField: "email" as const,
            searchOperator: "contains" as const,
            searchValue: opts.search,
          }
        : {}),
    },
  });

  return {
    users: res.users as AdminUser[],
    total: typeof res.total === "number" ? res.total : res.users.length,
    currentUserId,
  };
}

/**
 * Lists the shared "recommended" exercises (exercises.userId IS NULL) — the
 * catalog surfaced to every user. Admin-only; regular users can't mutate these.
 */
export async function listRecommendedExercises({
  search,
  limit = 20,
  offset = 0,
}: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdmin();
  const conditions = [isNull(exercises.userId)];
  if (search) conditions.push(ilike(exercises.name, `%${search}%`));
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(exercises)
      .where(where)
      .orderBy(asc(exercises.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(exercises).where(where),
  ]);

  return { rows, total };
}

/** All shared/recommended exercises (no pagination) — for the template builder's picker. */
export async function getAllRecommendedExercises() {
  await requireAdmin();
  return db
    .select()
    .from(exercises)
    .where(isNull(exercises.userId))
    .orderBy(asc(exercises.name));
}

/** Lists recommended program templates (programs.userId IS NULL) with a day count. */
export async function listRecommendedPrograms({
  search,
  limit = 20,
  offset = 0,
}: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdmin();
  const conditions = [isNull(programs.userId)];
  if (search) conditions.push(ilike(programs.name, `%${search}%`));
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(programs)
      .where(where)
      .orderBy(asc(programs.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(programs).where(where),
  ]);

  // Attach day counts for the list view.
  const withCounts = await Promise.all(
    rows.map(async (p) => {
      const [{ days }] = await db
        .select({ days: count() })
        .from(programDays)
        .where(eq(programDays.programId, p.id));
      return { ...p, dayCount: days };
    }),
  );

  return { rows: withCounts, total };
}

/**
 * Loads a single recommended program template (by id) with its days and the
 * exercises in each day — the shape the program builder consumes.
 */
export async function getRecommendedProgramById(id: string) {
  await requireAdmin();
  const program = await db.query.programs.findFirst({
    where: (p, { eq: e, and: a, isNull: n }) => a(e(p.id, id), n(p.userId)),
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
    }),
  );

  return { ...program, days: daysWithExercises };
}
