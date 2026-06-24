"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  programs,
  programExercises,
  sessionSets,
  trainerApplications,
} from "@/db/schema";
import { user } from "@/db/auth-schema";
import { slugify } from "@/lib/slug";
import { auth, requireAdmin } from "@/lib/auth";
import {
  parse,
  parseForm,
  idSchema,
  exerciseSchema,
  programSchema,
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

// --- recommended programs (templates: programs.userId IS NULL) ----------------

/** A slug unique among recommended templates; appends -2, -3, … on collision. */
async function uniqueTemplateSlug(
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(name) || "program";
  let slug = base;
  for (let n = 2; ; n++) {
    const rows = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(isNull(programs.userId), eq(programs.slug, slug)));
    const taken = rows.some((r) => r.id !== excludeId);
    if (!taken) return slug;
    slug = `${base}-${n}`;
  }
}

/** Throws unless the program exists and is a recommended template. */
async function assertTemplate(id: string) {
  const [row] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, id), isNull(programs.userId)))
    .limit(1);
  if (!row) throw new Error("Not found");
}

export async function createRecommendedProgram(formData: FormData) {
  await requireAdmin();
  const { name, description, targetRir } = parseForm(programSchema, formData);
  const slug = await uniqueTemplateSlug(name);

  const [program] = await db
    .insert(programs)
    .values({ userId: null, name, slug, description, isActive: false, targetRir })
    .returning();

  revalidatePath("/admin/programs");
  redirect(`/admin/programs/${program.id}/edit`);
}

export async function updateRecommendedProgram(id: string, formData: FormData) {
  await requireAdmin();
  const programId = parse(idSchema, id);
  await assertTemplate(programId);
  const { name, description, targetRir } = parseForm(programSchema, formData);
  const slug = await uniqueTemplateSlug(name, programId);

  await db
    .update(programs)
    .set({ name, slug, description, targetRir })
    .where(and(eq(programs.id, programId), isNull(programs.userId)));

  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${programId}/edit`);
}

export async function deleteRecommendedProgram(id: string) {
  await requireAdmin();
  const programId = parse(idSchema, id);
  await assertTemplate(programId);

  // Days + exercises cascade via FK onDelete. Templates aren't referenced by
  // user sessions (users clone them), so there's no logged history to orphan.
  await db
    .delete(programs)
    .where(and(eq(programs.id, programId), isNull(programs.userId)));

  revalidatePath("/admin/programs");
  redirect("/admin/programs");
}

// --- trainer applications -----------------------------------------------------

/** Loads a pending application by id, or throws. */
async function getPendingApplication(id: string) {
  const [row] = await db
    .select()
    .from(trainerApplications)
    .where(
      and(
        eq(trainerApplications.id, id),
        eq(trainerApplications.status, "pending"),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Application not found or already reviewed");
  return row;
}

export async function approveTrainerApplication(id: string) {
  const adminId = await requireAdmin();
  const applicationId = parse(idSchema, id);
  const application = await getPendingApplication(applicationId);

  // Re-check the applicant's CURRENT role before promoting. A stale pending
  // application must never *demote* someone who has since become a trainer or
  // (especially) an admin — only plain users get promoted. Either way the
  // application is closed so it leaves the queue.
  const [applicant] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, application.userId))
    .limit(1);

  if (applicant && applicant.role !== "trainer" && applicant.role !== "admin") {
    await auth.api.setRole({
      headers: await headers(),
      body: { userId: application.userId, role: "trainer" },
    });
  }

  await db
    .update(trainerApplications)
    .set({ status: "approved", reviewedBy: adminId, reviewedAt: new Date() })
    .where(eq(trainerApplications.id, applicationId));

  revalidatePath("/admin/trainers");
  revalidatePath("/admin"); // refresh the role badge on the Users page
}

export async function declineTrainerApplication(id: string) {
  const adminId = await requireAdmin();
  const applicationId = parse(idSchema, id);
  await getPendingApplication(applicationId);

  await db
    .update(trainerApplications)
    .set({ status: "declined", reviewedBy: adminId, reviewedAt: new Date() })
    .where(eq(trainerApplications.id, applicationId));

  revalidatePath("/admin/trainers");
}
