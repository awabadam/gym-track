import { CheckCircle2, Clock, GraduationCap, XCircle } from "lucide-react";
import { getMyTrainerApplication } from "@/data/trainer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrainerApplicationForm } from "@/components/shared/trainer-application-form";

export default async function BecomeATrainerPage() {
  const { role, application } = await getMyTrainerApplication();

  const isTrainer = role === "trainer" || role === "admin";
  const isPending = !isTrainer && application?.status === "pending";
  const isDeclined = !isTrainer && application?.status === "declined";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Coaching"
        title="Become a trainer"
        subtitle="Coach other lifters with your own programs"
      />

      {isTrainer ? (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-signal" />
            <p className="font-medium">You&apos;re a trainer.</p>
            <p className="text-sm text-muted-foreground">
              Your account already has trainer access — no application needed.
            </p>
          </CardContent>
        </Card>
      ) : isPending ? (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <Clock className="mx-auto h-10 w-10 opacity-60" />
            <div className="flex justify-center">
              <Badge variant="secondary" className="border-foreground uppercase text-[10px]">
                Pending review
              </Badge>
            </div>
            <p className="font-medium">Your application is pending review.</p>
            <p className="text-sm text-muted-foreground">
              An admin will review your request shortly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 py-6">
            {isDeclined && (
              <div className="flex items-start gap-2 border-2 border-foreground bg-muted/40 p-3 text-sm">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p>
                  Your previous application was declined. You can apply again
                  below.
                </p>
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
                <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Apply to become a trainer</p>
                <p className="text-sm text-muted-foreground">
                  Trainers can build and share programs for the lifters they
                  coach. Submit your request and an admin will review it.
                </p>
              </div>
            </div>
            <TrainerApplicationForm
              submitLabel={isDeclined ? "Re-apply" : "Submit application"}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
