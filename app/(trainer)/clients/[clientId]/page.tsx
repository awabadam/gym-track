import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientDetail } from "@/data/trainer";
import { deleteAssignedProgram } from "@/app/actions/trainer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AssignProgramForm } from "@/components/shared/assign-program-form";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const detail = await getClientDetail(clientId);

  if (!detail) notFound();

  const { client, program } = detail;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2"
        aria-label="Back to clients"
      >
        <Link href="/clients">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Clients
        </Link>
      </Button>
      <PageHeader
        eyebrow="Client"
        title={client.name ?? "Unknown user"}
        subtitle={client.email ?? "—"}
      />

      {program ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assigned program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{program.name}</p>
                <p className="text-sm text-muted-foreground">
                  {program.days.length}{" "}
                  {program.days.length === 1 ? "day" : "days"}
                  {program.description ? ` · ${program.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/clients/${clientId}/program/edit`}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0"
                      aria-label={`Delete ${program.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete &quot;{program.name}&quot;?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Permanently deletes this assigned program and all its
                        days and exercises. The client&apos;s own programs and
                        workout logs are preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <form action={deleteAssignedProgram.bind(null, program.id)}>
                        <AlertDialogAction type="submit">
                          Delete program
                        </AlertDialogAction>
                      </form>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assign a program</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignProgramForm clientId={clientId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
