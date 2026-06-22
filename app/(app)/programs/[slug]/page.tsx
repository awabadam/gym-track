import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgramBySlug } from "@/data/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil } from "lucide-react";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);

  if (!program) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{program.name}</h1>
          {program.isActive && <Badge>Active</Badge>}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/programs/${slug}/edit`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
        </div>
        {program.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {program.description}
          </p>
        )}
      </div>

      {program.days.map((day) => (
        <Card key={day.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {day.dayCode}
              </Badge>
              <CardTitle className="text-base">{day.name}</CardTitle>
              {day.scheduledDay && (
                <span className="text-xs text-muted-foreground capitalize">
                  ({day.scheduledDay})
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: compact list */}
            <div className="sm:hidden divide-y">
              {day.exercises.map((ex) => (
                <div key={ex.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{ex.exerciseName}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {ex.sets} × {ex.repRangeMin}-{ex.repRangeMax}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {ex.exerciseType}
                    </Badge>
                    {ex.supersetGroup && (
                      <Badge variant="outline" className="text-xs">
                        SS {ex.supersetGroup}
                      </Badge>
                    )}
                    {ex.notes && (
                      <span className="text-xs text-muted-foreground truncate">{ex.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table className="table-fixed min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Exercise</TableHead>
                    <TableHead className="w-[10%]">Sets</TableHead>
                    <TableHead className="w-[10%]">Reps</TableHead>
                    <TableHead className="w-[15%]">Type</TableHead>
                    <TableHead className="w-[25%]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {day.exercises.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium">
                        {ex.exerciseName}
                        {ex.supersetGroup && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            SS {ex.supersetGroup}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{ex.sets}</TableCell>
                      <TableCell className="font-mono">
                        {ex.repRangeMin}-{ex.repRangeMax}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {ex.exerciseType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ex.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      <VolumeSummary days={program.days} />
    </div>
  );
}

function VolumeSummary({
  days,
}: {
  days: {
    exercises: {
      muscleGroup: string | null;
      sets: number;
    }[];
  }[];
}) {
  const volume = new Map<string, number>();
  for (const day of days) {
    for (const ex of day.exercises) {
      const group = ex.muscleGroup ?? "Other";
      volume.set(group, (volume.get(group) ?? 0) + ex.sets);
    }
  }

  if (volume.size === 0) return null;

  const sorted = [...volume.entries()].sort((a, b) => {
    if (a[0] === "Other") return 1;
    if (b[0] === "Other") return -1;
    return b[1] - a[1];
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Weekly volume</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map(([group, sets]) => (
            <div
              key={group}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <span className="text-sm capitalize">{group}</span>
              <span className="font-mono text-sm font-medium">{sets} sets</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
