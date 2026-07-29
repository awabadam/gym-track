// Plain server-renderable anchor — no client boundary needed. Keep in sync
// with the focus-visible styling used across every console shell.
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2"
    >
      Skip to content
    </a>
  );
}
