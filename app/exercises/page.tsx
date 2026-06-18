import { getExercises, getMuscleGroups } from "@/data/exercises";
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
import { AddExerciseDialog } from "@/components/shared/add-exercise-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { MuscleGroupFilter } from "@/components/shared/muscle-group-filter";
import { Pagination } from "@/components/shared/pagination";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const PAGE_SIZE = 20;

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; muscle?: string; page?: string }>;
}) {
  const { q, muscle, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ rows: exercises, total }, muscleGroups] = await Promise.all([
    getExercises({ search: q, muscleGroup: muscle, limit: PAGE_SIZE, offset }),
    getMuscleGroups(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Exercises"
        subtitle="Your movement library"
        action={<AddExerciseDialog />}
      />

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Suspense>
            <SearchInput placeholder="Search exercises..." />
          </Suspense>
        </div>
        <Suspense>
          <MuscleGroupFilter groups={muscleGroups} />
        </Suspense>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {q || muscle ? "No exercises match your search" : "No exercises yet"}
            </p>
            <p className="text-sm mt-1">
              {q || muscle
                ? "Try a different search term or filter"
                : "Add your first exercise to get started"}
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
                  <Link
                    key={ex.id}
                    href={`/exercises/${ex.id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{ex.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
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
                    <svg className="h-4 w-4 text-muted-foreground shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exercises.map((ex) => (
                      <TableRow key={ex.id} className="group">
                        <TableCell className="font-medium">
                          <Link
                            href={`/exercises/${ex.id}`}
                            className="hover:underline"
                          >
                            {ex.name}
                          </Link>
                        </TableCell>
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
