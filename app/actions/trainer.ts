"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trainerApplications } from "@/db/schema";
import { auth, requireUserId } from "@/lib/auth";
import { parseForm, trainerApplicationSchema } from "@/lib/validation";

/**
 * Submit an application to become a trainer. Rejects if the user is already a
 * trainer/admin or already has a pending application open.
 */
export async function applyToBeTrainer(formData: FormData) {
  const uid = await requireUserId();

  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role ?? null;
  if (role === "trainer" || role === "admin") {
    throw new Error("You already have trainer access");
  }

  const [pending] = await db
    .select({ id: trainerApplications.id })
    .from(trainerApplications)
    .where(
      and(
        eq(trainerApplications.userId, uid),
        eq(trainerApplications.status, "pending"),
      ),
    )
    .limit(1);
  if (pending) {
    throw new Error("You already have an application pending review");
  }

  const { note } = parseForm(trainerApplicationSchema, formData);

  try {
    await db.insert(trainerApplications).values({
      userId: uid,
      status: "pending",
      note,
    });
  } catch (e) {
    // Lost a race against a concurrent submit — the partial unique index on
    // pending applications rejected the duplicate. Surface the friendly message.
    if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
      throw new Error("You already have an application pending review");
    }
    throw e;
  }

  revalidatePath("/become-a-trainer");
  revalidatePath("/admin/trainers");
}
