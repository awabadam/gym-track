import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Brutalist content block: a hard-bordered container with an inverted
 * (ink) header bar, an optional amber tag chip, and an offset block shadow.
 */
export function Block({
  title,
  tag,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  tag?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "border-2 border-foreground bg-card shadow-[4px_4px_0_0_var(--shadow-color)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-foreground px-4 py-2.5 text-background">
        <span
          className="text-sm uppercase tracking-wide leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </span>
        {action
          ? action
          : tag && (
              <span className="bg-signal px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-signal-foreground">
                {tag}
              </span>
            )}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
