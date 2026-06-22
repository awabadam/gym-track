"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Users" },
  { href: "/admin/exercises", label: "Recommended" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1.5">
      {tabs.map((t) => {
        const active =
          t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            data-active={active}
            className="border-2 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide transition-none data-[active=false]:border-transparent data-[active=false]:text-muted-foreground data-[active=false]:hover:border-foreground data-[active=false]:hover:text-foreground data-[active=true]:border-foreground data-[active=true]:bg-signal data-[active=true]:text-signal-foreground data-[active=true]:shadow-[3px_3px_0_0_var(--foreground)]"
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
