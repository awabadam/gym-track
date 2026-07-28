"use client";

import { useState } from "react";
import { applyToBeTrainer } from "@/app/actions/trainer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function TrainerApplicationForm({
  submitLabel = "Submit application",
}: {
  submitLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await applyToBeTrainer(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit application");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="trainer-note">Why do you want to be a trainer? (optional)</Label>
        <textarea
          id="trainer-note"
          name="note"
          rows={4}
          maxLength={500}
          placeholder="Tell us about your coaching experience…"
          className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
