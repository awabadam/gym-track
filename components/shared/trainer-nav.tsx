"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [{ href: "/clients", label: "Clients" }];

/** Section nav for the coach console chrome (mirrors AdminNav on mobile). */
export function TrainerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            className="border-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-none data-[active=false]:border-transparent data-[active=false]:text-foreground data-[active=false]:hover:border-foreground data-[active=false]:hover:bg-foreground data-[active=false]:hover:text-background data-[active=true]:border-foreground data-[active=true]:bg-signal data-[active=true]:text-signal-foreground data-[active=true]:shadow-[3px_3px_0_0_var(--foreground)]"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
