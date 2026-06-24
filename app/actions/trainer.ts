"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trainerApplications, trainers, trainerClients } from "@/db/schema";
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

/**
 * Join (or switch to) a trainer using their invite code. A client has at most
 * one active trainer: switching ends the old link and opens a new one, keeping
 * the prior link as history.
 */
export async function joinTrainer(code: string) {
  const uid = await requireUserId();

  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) {
    throw new Error("Invalid invite code");
  }

  const [trainer] = await db
    .select({ trainerId: trainers.userId })
    .from(trainers)
    .where(eq(trainers.inviteCode, normalized))
    .limit(1);
  if (!trainer) {
    throw new Error("Invalid invite code");
  }

  if (trainer.trainerId === uid) {
    throw new Error("You can't coach yourself");
  }

  // Already linked to this exact trainer → nothing to do (avoid a needless
  // end/re-open churn on the same coach).
  const [current] = await db
    .select({
      id: trainerClients.id,
      trainerId: trainerClients.trainerId,
    })
    .from(trainerClients)
    .where(
      and(
        eq(trainerClients.clientId, uid),
        eq(trainerClients.status, "active"),
      ),
    )
    .limit(1);
  if (current && current.trainerId === trainer.trainerId) {
    throw new Error("You're already with this trainer");
  }

  try {
    await db.transaction(async (tx) => {
      // End any existing active link for this client before opening a new one
      // (the partial unique index allows only one active link per client).
      await tx
        .update(trainerClients)
        .set({ status: "ended", endedAt: new Date() })
        .where(
          and(
            eq(trainerClients.clientId, uid),
            eq(trainerClients.status, "active"),
          ),
        );

      await tx.insert(trainerClients).values({
        trainerId: trainer.trainerId,
        clientId: uid,
        status: "active",
      });
    });
  } catch (e) {
    // Lost a race against a concurrent join — the partial unique index rejected
    // the second active link. Surface a friendly, retryable message.
    if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
      throw new Error("Couldn't join — please try again");
    }
    throw e;
  }

  revalidatePath("/coach");
  revalidatePath("/clients");
}

/** Leave the current coach: ends this client's active link (kept as history). */
export async function leaveTrainer() {
  const uid = await requireUserId();

  await db
    .update(trainerClients)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(trainerClients.clientId, uid),
        eq(trainerClients.status, "active"),
      ),
    );

  revalidatePath("/coach");
  revalidatePath("/clients");
}
