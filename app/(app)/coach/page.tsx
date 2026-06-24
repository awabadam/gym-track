import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { getMyCoach } from "@/data/trainer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { JoinTrainerForm } from "@/components/shared/join-trainer-form";
import { LeaveTrainerButton } from "@/components/shared/leave-trainer-button";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CoachPage() {
  const coach = await getMyCoach();
  const coachName = coach?.name ?? "your coach";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Coaching"
        title="Coach"
        subtitle="Train with a coach using their invite code"
      />

      {coach ? (
        <Card>
          <CardContent className="space-y-5 py-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
                <HeartHandshake className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{coach.name ?? "Your coach"}</p>
                {coach.email && (
                  <p className="text-sm text-muted-foreground">{coach.email}</p>
                )}
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Coaching you since {formatDate(coach.startedAt)}
                </p>
              </div>
            </div>
            <LeaveTrainerButton trainerName={coachName} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 py-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
                <HeartHandshake className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Join a coach</p>
                <p className="text-sm text-muted-foreground">
                  Have an invite code from a trainer? Enter it below to let them
                  coach you. You can have one coach at a time.
                </p>
              </div>
            </div>
            <JoinTrainerForm />
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        Want to coach others?{" "}
        <Link
          href="/become-a-trainer"
          className="font-medium underline underline-offset-4 hover:text-foreground"
        >
          Become a trainer &rarr;
        </Link>
      </p>
    </div>
  );
}
