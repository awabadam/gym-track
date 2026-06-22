import { headers } from "next/headers";
import { and, asc, count, ilike, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercises } from "@/db/schema";
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
