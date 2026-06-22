import Link from "next/link";
import { getPrograms } from "@/data/programs";
import { duplicateProgram, setActiveProgram } from "@/app/actions/programs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Plus, ArrowRight, Copy, ListChecks, Check } from "lucide-react";

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
        <Card>
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
        <div className="grid gap-3">
          {programs.map((p) => (
            <Card key={p.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <Link href={`/programs/${p.slug}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.isActive && (
                      <Badge className="text-xs">Active</Badge>
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
                    <form action={setActiveProgram.bind(null, p.id)}>
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        aria-label={`Set ${p.name} as active`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Set active
                      </Button>
                    </form>
                  )}
                  <form action={duplicateProgram.bind(null, p.id)}>
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0" type="submit" aria-label={`Duplicate ${p.name}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </form>
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
