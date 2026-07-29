"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Display-name editor. Email is shown read-only (no email-change flow yet). */
export function AccountSettingsForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    setPending(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setPending(false);
    if (error) {
      setError(error.message ?? "Couldn't save. Try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-name">Display name</Label>
        <Input
          id="settings-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          required
          aria-invalid={!!error}
          autoComplete="name"
          className="max-w-sm"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-email">Email</Label>
        <Input
          id="settings-email"
          value={email}
          readOnly
          disabled
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">
          Email changes aren&apos;t supported yet.
        </p>
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || name.trim() === initialName}>
          {pending ? "Saving…" : "Save name"}
        </Button>
        {saved && (
          <span
            role="status"
            className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
          >
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
