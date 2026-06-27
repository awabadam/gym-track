import { GraduationCap } from "lucide-react";
import { listTrainerApplications } from "@/data/admin";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { TrainerApplicationActions } from "@/components/shared/trainer-application-actions";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminTrainersPage() {
  const { rows, total } = await listTrainerApplications({ status: "pending" });

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Trainers" }]}
      />
      <PageHeader
        title="Trainers"
        subtitle="Review trainer applications"
      />

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">No pending applications</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Mobile: card list */}
            <div className="divide-y sm:hidden">
              {rows.map((r) => (
                <div key={r.id} className="space-y-2 p-3">
                  <div>
                    <p className="font-medium">{r.applicantName ?? "Unknown user"}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.applicantEmail ?? "—"}
                    </p>
                  </div>
                  {r.note && <p className="text-sm">{r.note}</p>}
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Submitted {formatDate(r.createdAt)}
                  </p>
                  <TrainerApplicationActions
                    id={r.id}
                    applicantName={r.applicantName ?? "this user"}
                  />
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                    <TableHead className="w-48" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.applicantName ?? "Unknown user"}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.applicantEmail ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {r.note ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </TableCell>
                      <TableCell>
                        <TrainerApplicationActions
                          id={r.id}
                          applicantName={r.applicantName ?? "this user"}
                        />
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
