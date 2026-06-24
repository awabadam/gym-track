"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

// Path-relative invite link; the absolute URL is resolved on copy from the
// current origin (the server doesn't know the public host).
function inviteLink(code: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${code}`;
}

/**
 * Shows a trainer's invite code plus a shareable /join/CODE link, with
 * copy-to-clipboard.
 */
export function InviteCodeShare({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const link = `/join/${code}`;

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-2 border-foreground bg-muted/40 p-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Invite code
          </p>
          <p className="font-mono text-2xl uppercase tracking-[0.2em]">{code}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => copy(code, "code")}
          aria-label="Copy invite code"
        >
          {copied === "code" ? (
            <Check className="mr-1 h-4 w-4" />
          ) : (
            <Copy className="mr-1 h-4 w-4" />
          )}
          {copied === "code" ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {link}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => copy(inviteLink(code), "link")}
          aria-label="Copy invite link"
        >
          {copied === "link" ? (
            <Check className="mr-1 h-4 w-4" />
          ) : (
            <Copy className="mr-1 h-4 w-4" />
          )}
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
