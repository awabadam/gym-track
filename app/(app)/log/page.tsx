import Link from "next/link";
import { getRecentSessionsWithSetCount } from "@/data/sessions";
import { getAllProgramDays } from "@/data/programs";
import { formatDate, formatStatus } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { DeleteSessionButton } from "@/components/shared/delete-session-button";
import { AddPastWorkoutDialog } from "@/components/shared/add-past-workout-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ChevronRight, ClipboardList } from "lucide-react";
import { Suspense } from "react";

const PAGE_SIZE = 20;

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ rows: sessions, total }, programDays] = await Promise.all([
    getRecentSessionsWithSetCount({ limit: PAGE_SIZE, offset }),
    getAllProgramDays(),
  ]);

  const today = new Date().toISOString().split("T")[0];

  // Group by date
  const grouped = sessions.reduce(
    (acc, s) => {
      if (!acc[s.date]) acc[s.date] = [];
      acc[s.date].push(s);
      return acc;
    },
    {} as Record<string, typeof sessions>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workout Log"
        subtitle="Every session you've logged"
        action={<AddPastWorkoutDialog days={programDays} today={today} />}
      />

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No workouts logged yet</p>
            <p className="text-sm mt-1">
              Complete a workout to see it here
            </p>
            <div className="mt-4 flex justify-center">
              <AddPastWorkoutDialog days={programDays} today={today} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {Object.entries(grouped).map(([date, daySessions]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <span className="font-medium">{formatDate(date)}</span>
                  <span className="text-muted-foreground font-mono ml-2 text-xs">{date}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {daySessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 text-sm py-2 px-2 -mx-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <Link
                        href={`/log/${s.id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs shrink-0"
                        >
                          {s.dayCode}
                        </Badge>
                        <span className="truncate font-medium">{s.dayName}</span>
                        {s.setCount > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
                            {s.setCount} {s.setCount === 1 ? "set" : "sets"}
                          </span>
                        )}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          <Badge
                            variant={
                              s.status === "completed" ? "default" : "outline"
                            }
                            className="text-xs"
                          >
                            {formatStatus(s.status)}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                      <DeleteSessionButton sessionId={s.id} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Suspense>
            <Pagination total={total} pageSize={PAGE_SIZE} page={page} />
          </Suspense>
        </>
      )}
    </div>
  );
}
