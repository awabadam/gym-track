import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { trainerApplications } from "@/db/schema";
import { auth, requireUserId } from "@/lib/auth";

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
