"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, requireAdmin } from "@/lib/auth";
import {
  parse,
  parseForm,
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
