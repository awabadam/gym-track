import Link from "next/link";
import { Suspense } from "react";
import { listRecommendedPrograms } from "@/data/admin";
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
import { CreateRecommendedProgramDialog } from "@/components/shared/create-recommended-program-dialog";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ListChecks, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: programs, total } = await listRecommendedPrograms({
    search: q,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Programs" }]}
      />
      <PageHeader
        title="Programs"
        subtitle="Recommended program templates"
        action={<CreateRecommendedProgramDialog />}
      />

      <Suspense>
        <SearchInput placeholder="Search recommended programs..." />
      </Suspense>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {q ? "No programs match your search" : "No recommended programs yet"}
            </p>
            <p className="text-sm mt-1">
              {q ? "Try a different term" : "Add one and build out its days"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              {/* Mobile: list */}
              <div className="sm:hidden divide-y">
                {programs.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/programs/${p.id}/edit`}
                    className="flex items-center justify-between p-3 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.dayCount} {p.dayCount === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead className="hidden md:table-cell">Target RIR</TableHead>
                      <TableHead className="hidden lg:table-cell">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/programs/${p.id}/edit`}
                            className="hover:underline"
                          >
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {p.dayCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">
                          {p.targetRir}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[280px] truncate">
                          {p.description}
                        </TableCell>
                      </TableRow>
                    ))}
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
