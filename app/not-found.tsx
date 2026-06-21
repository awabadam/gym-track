import Link from "next/link";

// Rendered for unmatched routes and any `notFound()` call (e.g. a program/
// session/exercise that doesn't exist or isn't owned by the current user).
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md border-2 border-foreground bg-card p-8 shadow-[4px_4px_0_0_var(--shadow-color)]">
        <span className="inline-block border-2 border-foreground bg-signal px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-signal-foreground">
          {"// 404"}
        </span>
        <h1 className="mt-4 text-6xl" style={{ fontFamily: "var(--font-display)" }}>
          404
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page doesn’t exist, or it isn’t yours to view.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block border-2 border-foreground bg-foreground px-4 py-2 text-sm font-bold uppercase tracking-wide text-background transition-colors hover:bg-signal hover:text-signal-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
