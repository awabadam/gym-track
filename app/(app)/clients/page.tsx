import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getMyActiveClients, getMyTrainerInvite } from "@/data/trainer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteCodeShare } from "@/components/shared/invite-code-share";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ClientsPage() {
  // Trainer-only page (admins aren't trainers). Gate via the session role.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "trainer") redirect("/");

  const [{ code }, clients] = await Promise.all([
    getMyTrainerInvite(),
    getMyActiveClients(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Coaching"
        title="Clients"
        subtitle="Share your invite code and see who you're coaching"
      />

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-1">
            <p className="font-medium">Invite a lifter</p>
            <p className="text-sm text-muted-foreground">
              Share your code or link — anyone with an account can join you as
              their coach.
            </p>
          </div>
          <InviteCodeShare code={code} />
        </CardContent>
      </Card>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No clients yet</p>
            <p className="text-sm">
              Share your invite code to start coaching lifters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Mobile: card list */}
            <div className="divide-y sm:hidden">
              {clients.map((c) => (
                <div key={c.id} className="space-y-1 p-3">
                  <p className="font-medium">{c.name ?? "Unknown user"}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.email ?? "—"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Joined {formatDate(c.startedAt)}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name ?? "Unknown user"}</p>
                        <p className="text-sm text-muted-foreground lg:hidden">
                          {c.email ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {c.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.startedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
