"use client";

import { useTransition } from "react";
import { completeSession } from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

/**
 * Submits the active session as complete. `completeSession` redirects to
 * /log on success, which surfaces as a thrown NEXT_REDIRECT — swallow that
 * and let it propagate the navigation, only surface genuine errors.
 */
export function FinishWorkoutButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await completeSession(sessionId);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes("NEXT_REDIRECT"))) {
          throw e;
        }
      }
    });
  }

  return (
    <Button
      type="button"
      className="w-full"
      size="lg"
      onClick={handleClick}
      disabled={pending}
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      {pending ? "Finishing…" : "Finish workout"}
    </Button>
  );
}
