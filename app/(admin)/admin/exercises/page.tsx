import { Suspense } from "react";
import { listRecommendedExercises } from "@/data/admin";
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
import { RecommendedExerciseDialog } from "@/components/shared/recommended-exercise-dialog";
import { RecommendedExerciseActions } from "@/components/shared/recommended-exercise-actions";
import { Dumbbell } from "lucide-react";

const PAGE_SIZE = 20;

export default async function AdminExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: exercises, total } = await listRecommendedExercises({
    search: q,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Recommended"
        subtitle="The shared exercise catalog every user sees"
        action={<RecommendedExerciseDialog />}
      />

      <Suspense>
        <SearchInput placeholder="Search recommended exercises..." />
      </Suspense>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {q ? "No exercises match your search" : "No recommended exercises yet"}
            </p>
            <p className="text-sm mt-1">
              {q ? "Try a different term" : "Add one to seed the shared catalog"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              {/* Mobile: card list */}
              <div className="sm:hidden divide-y">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between gap-2 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{ex.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {ex.muscleGroup && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {ex.muscleGroup}
                          </Badge>
                        )}
                        {ex.type && (
                          <Badge variant="secondary" className="capitalize text-xs">
                            {ex.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <RecommendedExerciseActions exercise={ex} />
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Muscle group</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Notes</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exercises.map((ex) => (
                      <TableRow key={ex.id}>
                        <TableCell className="font-medium">{ex.name}</TableCell>
                        <TableCell>
                          {ex.muscleGroup && (
                            <Badge variant="outline" className="capitalize text-xs">
                              {ex.muscleGroup}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {ex.type && (
                            <Badge variant="secondary" className="capitalize text-xs">
                              {ex.type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                          {ex.notes}
                        </TableCell>
                        <TableCell>
                          <RecommendedExerciseActions exercise={ex} />
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
