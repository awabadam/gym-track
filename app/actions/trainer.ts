"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or, ne, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  trainerApplications,
  trainers,
  trainerClients,
  programs,
} from "@/db/schema";
import { auth, requireTrainer, requireUserId } from "@/lib/auth";
import {
  parseForm,
  trainerApplicationSchema,
  programSchema,
} from "@/lib/validation";
import { slugify } from "@/lib/slug";

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

  // NOTE: the Neon HTTP driver has no transaction support, so these run as
  // sequential statements. The partial unique index on (clientId WHERE active)
  // is the integrity backstop: at most one active link can ever exist.
  try {
    // Switching away from a previous coach: hand their assigned program to the
    // client so it isn't lost, before the old link is ended.
    if (current) {
      await transferAssignedPrograms(current.trainerId, uid);
    }

    // End any existing active link for this client before opening a new one.
    await db
      .update(trainerClients)
      .set({ status: "ended", endedAt: new Date() })
      .where(
        and(
          eq(trainerClients.clientId, uid),
          eq(trainerClients.status, "active"),
        ),
      );

    await db.insert(trainerClients).values({
      trainerId: trainer.trainerId,
      clientId: uid,
      status: "active",
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

/**
 * When a trainer↔client link ends (leave or switch), hand any program that
 * trainer authored for the client over to the client as their OWN program — so
 * the client keeps their plan — and detach it from the trainer. Without this an
 * ex-client would keep following/logging the program and the trainer would keep
 * editing it live. (Sequential statements — the Neon HTTP driver has no
 * transactions; at most one assigned program exists per client.)
 */
async function transferAssignedPrograms(trainerId: string, clientId: string) {
  const assigned = await db
    .select({ id: programs.id, slug: programs.slug })
    .from(programs)
    .where(
      and(
        eq(programs.userId, trainerId),
        eq(programs.assignedClientId, clientId),
      ),
    );

  for (const p of assigned) {
    // Make the slug unique within the CLIENT's namespace now that they own it.
    let slug = p.slug;
    for (let n = 2; ; n++) {
      const [clash] = await db
        .select({ id: programs.id })
        .from(programs)
        .where(
          and(
            eq(programs.userId, clientId),
            eq(programs.slug, slug),
            ne(programs.id, p.id),
          ),
        )
        .limit(1);
      if (!clash) break;
      slug = `${p.slug}-${n}`;
    }
    await db
      .update(programs)
      .set({ userId: clientId, assignedClientId: null, slug })
      .where(eq(programs.id, p.id));
  }
}

/**
 * Author a program FOR an active client. The program is owned by the trainer
 * (userId=trainer) and assigned to the client (assignedClientId=client). One
 * assigned program per client for now. Redirects into the builder.
 */
export async function assignProgram(clientId: string, formData: FormData) {
  const trainerId = await requireTrainer();
  await assertActiveClient(trainerId, clientId);

  const [existing] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(
      and(
        eq(programs.userId, trainerId),
        eq(programs.assignedClientId, clientId),
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(
      "This client already has an assigned program. Delete it before assigning another.",
    );
  }

  const { name, description, targetRir } = parseForm(programSchema, formData);

  // Slug must be unique within the trainer's own programs; append -2, -3, … on
  // collision (matches the (userId, slug) unique index).
  // Slug must be unique within the trainer's own programs (the (userId, slug)
  // index) AND must not shadow one of the CLIENT's own program slugs — else the
  // assigned program would be unreachable at /programs/[slug] for the client.
  const base = slugify(name);
  let slug = base;
  for (let n = 2; ; n++) {
    const [clash] = await db
      .select({ id: programs.id })
      .from(programs)
      .where(
        or(
          and(eq(programs.userId, trainerId), eq(programs.slug, slug)),
          and(
            eq(programs.userId, clientId),
            isNull(programs.assignedClientId),
            eq(programs.slug, slug),
          ),
        ),
      )
      .limit(1);
    if (!clash) break;
    slug = `${base}-${n}`;
  }

  await db.insert(programs).values({
    userId: trainerId,
    assignedClientId: clientId,
    name,
    slug,
    description,
    isActive: false,
    targetRir,
  });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}/program/edit`);
}

/**
 * Delete the trainer's assigned program for a client (cascades days/exercises).
 * Guarded to the trainer's own assigned programs only.
 */
export async function deleteAssignedProgram(programId: string) {
  const trainerId = await requireTrainer();

  const [program] = await db
    .select({ assignedClientId: programs.assignedClientId })
    .from(programs)
    .where(
      and(
        eq(programs.id, programId),
        eq(programs.userId, trainerId),
        isNotNull(programs.assignedClientId),
      ),
    )
    .limit(1);
  if (!program) throw new Error("Not found");

  await db.delete(programs).where(eq(programs.id, programId));

  const clientId = program.assignedClientId;
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

/** Leave the current coach: ends this client's active link (kept as history). */
export async function leaveTrainer() {
  const uid = await requireUserId();

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
  if (!link) return; // no active coach — nothing to leave

  // Keep the client's plan: hand the coach's assigned program to them, then end
  // the link. Sequential (no transactions on the Neon HTTP driver).
  await transferAssignedPrograms(link.trainerId, uid);
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
  revalidatePath("/programs");
}
