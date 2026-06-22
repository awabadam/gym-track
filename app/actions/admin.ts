"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { exercises, programExercises, sessionSets } from "@/db/schema";
import { auth, requireAdmin } from "@/lib/auth";
import {
  parse,
  parseForm,
  idSchema,
  exerciseSchema,
  createUserSchema,
  setRoleSchema,
  setPasswordSchema,
  banUserSchema,
} from "@/lib/validation";

/** Target user id must be present; guards against acting on your own account. */
function userId(id: unknown): string {
  if (typeof id !== "string" || !id.trim()) throw new Error("Missing user id");
  return id;
}

async function requireOtherUser(targetId: string): Promise<void> {
  const adminId = await requireAdmin();
  if (adminId === targetId) {
    throw new Error("You can't perform this action on your own account");
  }
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const data = parseForm(createUserSchema, formData);

  await auth.api.createUser({
    headers: await headers(),
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    },
  });

  revalidatePath("/admin");
}

export async function setUserRole(id: string, role: string) {
  const target = userId(id);
  await requireOtherUser(target);
  const { role: validRole } = parse(setRoleSchema, { role });

  await auth.api.setRole({
    headers: await headers(),
    body: { userId: target, role: validRole },
  });

  revalidatePath("/admin");
}

export async function banUser(id: string, formData: FormData) {
  const target = userId(id);
  await requireOtherUser(target);
  const { reason, expiresInDays } = parseForm(banUserSchema, formData);

  await auth.api.banUser({
    headers: await headers(),
    body: {
      userId: target,
      ...(reason ? { banReason: reason } : {}),
      ...(expiresInDays > 0 ? { banExpiresIn: expiresInDays * 86400 } : {}),
    },
  });

  revalidatePath("/admin");
}

export async function unbanUser(id: string) {
  const target = userId(id);
  await requireAdmin();

  await auth.api.unbanUser({
    headers: await headers(),
    body: { userId: target },
  });

  revalidatePath("/admin");
}

export async function setUserPassword(id: string, formData: FormData) {
  const target = userId(id);
  await requireAdmin();
  const { newPassword } = parseForm(setPasswordSchema, formData);

  await auth.api.setUserPassword({
    headers: await headers(),
    body: { userId: target, newPassword },
  });

  revalidatePath("/admin");
}

export async function removeUser(id: string) {
  const target = userId(id);
  await requireOtherUser(target);

  await auth.api.removeUser({
    headers: await headers(),
    body: { userId: target },
  });

  revalidatePath("/admin");
}

export async function impersonateUser(id: string) {
  const target = userId(id);
  await requireOtherUser(target);

  await auth.api.impersonateUser({
    headers: await headers(),
    body: { userId: target },
  });

  // Now signed in as the target — land them on the dashboard.
  redirect("/");
}

export async function stopImpersonating() {
  await auth.api.stopImpersonating({ headers: await headers() });
  redirect("/admin");
}

// --- recommended exercises (the shared userId IS NULL catalog) ----------------

/** Throws unless the exercise exists and is a shared/recommended one. */
async function assertRecommended(id: string) {
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, id), isNull(exercises.userId)))
    .limit(1);
  if (!row) throw new Error("Not found");
}

export async function createRecommendedExercise(formData: FormData) {
  await requireAdmin();
  const data = parseForm(exerciseSchema, formData);

  // userId NULL = shared/recommended, visible to all, owned by no one.
  await db.insert(exercises).values({ userId: null, ...data });

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
}

export async function updateRecommendedExercise(id: string, formData: FormData) {
  await requireAdmin();
  const exerciseId = parse(idSchema, id);
  await assertRecommended(exerciseId);
  const data = parseForm(exerciseSchema, formData);

  await db
    .update(exercises)
    .set(data)
    .where(and(eq(exercises.id, exerciseId), isNull(exercises.userId)));

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
}

export async function deleteRecommendedExercise(id: string) {
  await requireAdmin();
  const exerciseId = parse(idSchema, id);
  await assertRecommended(exerciseId);

  // Don't orphan history: block deletion while in use, same as user exercises.
  const [programUsage] = await db
    .select({ total: count() })
    .from(programExercises)
    .where(eq(programExercises.exerciseId, exerciseId));
  if (programUsage.total > 0) {
    throw new Error(
      `Cannot delete: used in ${programUsage.total} program(s) across users.`,
    );
  }

  const [setUsage] = await db
    .select({ total: count() })
    .from(sessionSets)
    .where(eq(sessionSets.exerciseId, exerciseId));
  if (setUsage.total > 0) {
    throw new Error(
      `Cannot delete: has ${setUsage.total} logged set(s) across users.`,
    );
  }

  await db
    .delete(exercises)
    .where(and(eq(exercises.id, exerciseId), isNull(exercises.userId)));

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
}
