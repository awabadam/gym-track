import { db } from "@/db";
import { programs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedProgramForUser } from "@/db/seed-program";

/**
 * Ensures a user has at least one program. New users (first sign-in) get a
 * personal copy of the default MaxGrowth program so they have something to log
 * against immediately. Safe to call on every dashboard load — it no-ops once a
 * program exists, and the (user_id, slug) unique index guards against a double
 * seed from concurrent first requests.
 */
export async function ensureUserSeeded(userId: string) {
  const existing = await db
    .select({ id: programs.id })
    .from(programs)
    .where(eq(programs.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  try {
    await seedProgramForUser(userId);
  } catch {
    // Another concurrent request likely seeded first; ignore.
  }
}
