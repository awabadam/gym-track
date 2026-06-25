"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsRead() {
  const uid = await requireUserId();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, uid), isNull(notifications.readAt)));

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
