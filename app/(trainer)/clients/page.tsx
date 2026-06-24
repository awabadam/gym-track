import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
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
  // The (trainer) layout gates the whole console to trainers; data fns also
  // call requireTrainer().
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
                <Link
                  key={c.id}
                  href={`/clients/${c.clientId}`}
                  className="flex items-center justify-between gap-2 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{c.name ?? "Unknown user"}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.email ?? "—"}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Joined {formatDate(c.startedAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
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
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/clients/${c.clientId}`}
                          className="font-medium hover:underline"
                        >
                          {c.name ?? "Unknown user"}
                        </Link>
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
                      <TableCell>
                        <Link
                          href={`/clients/${c.clientId}`}
                          aria-label={`View ${c.name ?? "client"}`}
                          className="text-muted-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
