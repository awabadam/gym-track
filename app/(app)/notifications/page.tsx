import Link from "next/link";
import { Bell } from "lucide-react";
import { getMyNotifications } from "@/data/notifications";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatStamp(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function NotificationsPage() {
  const notifications = await getMyNotifications(50);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        action={
          hasUnread ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" size="sm" variant="outline">
                Mark all read
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No notifications yet</p>
            <p className="mt-1 text-sm">
              Coaching activity and workout updates will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const unread = !n.readAt;
            const inner = (
              <div
                className={`border-2 p-3 ${
                  unread
                    ? "border-foreground bg-signal/10"
                    : "border-foreground/40"
                }`}
              >
                <div className="flex items-start gap-2">
                  {unread && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 bg-signal"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatStamp(n.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.linkPath ? (
                  <Link href={n.linkPath} className="block hover:opacity-80">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
