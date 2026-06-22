import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isCurrentUserAdmin } from "@/lib/auth";
import { listUsersForAdmin } from "@/data/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { CreateUserDialog } from "@/components/shared/create-user-dialog";
import { UserRowActions } from "@/components/shared/user-row-actions";
import { Users } from "lucide-react";

const PAGE_SIZE = 20;

function RoleBadge({ role }: { role?: string | null }) {
  if (role === "admin") {
    return (
      <Badge className="bg-signal text-signal-foreground border-foreground uppercase text-[10px]">
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="uppercase text-[10px]">
      User
    </Badge>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!(await isCurrentUserAdmin())) redirect("/");

  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { users, total, currentUserId } = await listUsersForAdmin({
    search: q,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle="Manage accounts, roles & access"
        action={<CreateUserDialog />}
      />

      <Suspense>
        <SearchInput placeholder="Search by email..." />
      </Suspense>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {q ? "No users match your search" : "No users yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              {/* Mobile: card list */}
              <div className="sm:hidden divide-y">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {u.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {u.email}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <RoleBadge role={u.role} />
                          {u.banned && (
                            <Badge variant="destructive" className="text-[10px] uppercase">
                              Banned
                            </Badge>
                          )}
                        </div>
                      </div>
                      <UserRowActions user={u} isSelf={isSelf} />
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Joined</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const isSelf = u.id === currentUserId;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.name}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={u.role} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {u.banned ? (
                              <Badge variant="destructive" className="text-[10px] uppercase">
                                Banned
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Active
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <UserRowActions user={u} isSelf={isSelf} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Suspense>
            <Pagination total={total} pageSize={PAGE_SIZE} page={page} />
          </Suspense>
        </>
      )}
    </div>
  );
}
