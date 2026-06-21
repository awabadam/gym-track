"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

// Catches uncaught render errors anywhere in the app shell (a data fetch that
// throws, an unexpected exception, etc.). Next 16.2+ passes `unstable_retry`,
// which re-fetches and re-renders this segment's children.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO(observability): forward to an error-reporting service.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md border-2 border-foreground bg-card p-8 shadow-[4px_4px_0_0_var(--shadow-color)]">
        <span className="inline-block border-2 border-foreground bg-signal px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-signal-foreground">
          {"// Error"}
        </span>
        <h1 className="mt-4 text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Something broke
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          An unexpected error stopped this page from loading. You can try again or
          head back to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => unstable_retry()}
            className="border-2 border-foreground bg-foreground px-4 py-2 text-sm font-bold uppercase tracking-wide text-background transition-colors hover:bg-signal hover:text-signal-foreground"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-2 border-foreground px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-signal hover:text-signal-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
