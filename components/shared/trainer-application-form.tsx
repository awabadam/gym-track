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

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await applyToBeTrainer(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit application");
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
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
