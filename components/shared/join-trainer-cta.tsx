"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinTrainer } from "@/app/actions/trainer";
import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

/**
 * One-click Join button for the /join/[code] invite landing (signed-in
 * visitor). On success it sends the user to their /coach page.
 */
export function JoinTrainerCta({
  code,
  trainerName,
}: {
  code: string;
  trainerName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      try {
        await joinTrainer(code);
        router.push("/coach");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to join trainer");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handleJoin} disabled={pending}>
        <HeartHandshake className="mr-1 h-4 w-4" />
        Join {trainerName} as your coach
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
