"use client";

import { useState, useTransition } from "react";
import { leaveTrainer } from "@/app/actions/trainer";
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
import { UserMinus } from "lucide-react";

export function LeaveTrainerButton({
  trainerName,
}: {
  trainerName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      try {
        await leaveTrainer();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't leave your coach");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          <UserMinus className="mr-1 h-4 w-4" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {trainerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll no longer be coached by {trainerName}. You can join another
            trainer (or rejoin) anytime with an invite code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeave} disabled={pending}>
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
