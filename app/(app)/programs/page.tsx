import Link from "next/link";
import { getPrograms } from "@/data/programs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { SetActiveButton } from "@/components/shared/set-active-button";
import { DuplicateProgramButton } from "@/components/shared/duplicate-program-button";
import { Plus, ArrowRight, ListChecks } from "lucide-react";

export default async function ProgramsPage() {
  const programs = await getPrograms();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs"
        subtitle="Your training blueprints"
        action={
          <Button asChild size="sm">
            <Link href="/programs/new">
              <Plus className="h-4 w-4 mr-1" />
              New program
            </Link>
          </Button>
        }
      />

      {programs.length === 0 ? (
        <Card className="reveal [animation-delay:120ms]">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No programs yet</p>
            <p className="text-sm mt-1">Create your first workout program to get started</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/programs/new">
                <Plus className="h-4 w-4 mr-1" />
                New program
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="reveal [animation-delay:120ms] grid gap-3">
          {programs.map((p) => (
            <Card key={p.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <Link href={`/programs/${p.slug}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.isActive && (
                      <Badge className="text-xs">Active</Badge>
                    )}
                    {p.isAssigned && (
                      <Badge variant="secondary" className="text-xs">
                        From your coach
                      </Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.description}
                    </p>
                  )}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!p.isActive && (
                    <SetActiveButton programId={p.id} programName={p.name} />
                  )}
                  {p.canEdit && (
                    <DuplicateProgramButton programId={p.id} programName={p.name} />
                  )}
                  <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0" aria-label={`View ${p.name}`}>
                    <Link href={`/programs/${p.slug}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
