import Link from "next/link";
import { headers } from "next/headers";
import { HeartHandshake, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTrainerByCode } from "@/data/trainer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JoinTrainerCta } from "@/components/shared/join-trainer-cta";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [trainer, session] = await Promise.all([
    getTrainerByCode(code),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!trainer) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Coaching" title="Invite" />
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="font-medium">This invite is invalid or expired.</p>
            <p className="text-sm text-muted-foreground">
              Double-check the code with whoever sent it to you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trainerName = trainer.name ?? "this trainer";
  const isSignedIn = Boolean(session?.user);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Coaching" title="Coaching invite" />
      <Card>
        <CardContent className="space-y-5 py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
              <HeartHandshake className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Join {trainerName} as your coach</p>
              <p className="text-sm text-muted-foreground">
                {isSignedIn
                  ? "Joining adds them as your coach. If you already have a coach, this replaces them."
                  : "Create an account to join. You'll only need an invite code once you're signed in."}
              </p>
            </div>
          </div>

          {isSignedIn ? (
            <JoinTrainerCta code={code} trainerName={trainerName} />
          ) : (
            <Button asChild>
              <Link href="/sign-up">Create an account to join</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
