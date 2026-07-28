import { Suspense } from "react";
import { listUsersForAdmin } from "@/data/admin";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { CreateUserDialog } from "@/components/shared/create-user-dialog";
import { AdminUsersTable } from "@/components/shared/admin-users-table";
import { Users } from "lucide-react";

const PAGE_SIZE = 20;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
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
          <AdminUsersTable users={users} currentUserId={currentUserId} />

          <Suspense>
            <Pagination total={total} pageSize={PAGE_SIZE} page={page} />
          </Suspense>
        </>
      )}
    </div>
  );
}
