"use client";

import { useState } from "react";
import { joinTrainer } from "@/app/actions/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinTrainerForm({
  submitLabel = "Join",
}: {
  submitLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await joinTrainer(String(formData.get("code") ?? ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join trainer");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={8}
          placeholder="e.g. K7HMX2PQ"
          className="font-mono uppercase tracking-[0.2em]"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
