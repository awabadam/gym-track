import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
