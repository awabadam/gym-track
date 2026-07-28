import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { NewProgramForm } from "@/components/shared/new-program-form";

export default function NewProgramPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Programs", href: "/programs" }, { label: "New" }]}
      />
      <PageHeader title="New program" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewProgramForm />
        </CardContent>
      </Card>
    </div>
  );
}
