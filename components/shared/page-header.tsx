import * as React from "react";

/**
 * Consistent brutalist page header: a big display title over a hard bottom
 * rule, with an optional eyebrow chip, subtitle, and right-aligned action.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b-2 border-foreground pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-2 inline-block border-2 border-foreground bg-signal px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-signal-foreground">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
