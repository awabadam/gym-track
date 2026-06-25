import { db } from "@/db";
import { notifications } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";

export type NotificationRow = typeof notifications.$inferSelect;

/**
 * Insert an in-app notification for `userId`. Internal helper called by the
 * actions that produce notable events (a coach note, a program assignment, a
 * client joining/leaving, a logged workout). Not a user-triggered action.
 */
export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  linkPath?: string | null;
}): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    linkPath: input.linkPath ?? null,
  });
}

/** Display name for a user id, falling back to "Someone" / "Your coach". */
export async function getDisplayName(
  userId: string,
  fallback = "Someone",
): Promise<string> {
  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.name ?? fallback;
}

/** The current user's notifications, newest first. */
export async function getMyNotifications(limit = 30): Promise<NotificationRow[]> {
  const uid = await requireUserId();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, uid))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** Count of the current user's unread notifications (for the header badge). */
export async function getMyUnreadCount(): Promise<number> {
  const uid = await requireUserId();
  const [row] = await db
    .select({ c: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, uid), isNull(notifications.readAt)));
  return row?.c ?? 0;
}
