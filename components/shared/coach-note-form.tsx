"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Small textarea + submit for leaving a coaching note. The bound server action
 * (clientId / sessionId already applied) is passed in by the page.
 */
export function CoachNoteForm({
  action,
  placeholder = "Write a note for this client…",
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await action(formData);
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-2">
      <textarea
        name="body"
        rows={3}
        required
        placeholder={placeholder}
        className="flex w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}
