"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  // Match the href exactly instead of by prefix (used for a section root like
  // "/" or "/admin" that would otherwise stay active on every child route).
  exact?: boolean;
  // Optional group label (e.g. "Train", "Build"). When any item has one, the
  // sidebar renders a labeled group per section instead of one flat list.
  section?: string;
}

interface Brand {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

/**
 * Shared brutalist sidebar shell used by both the app and admin consoles.
 * Hidden on mobile (each console provides its own mobile navigation).
 */
export function NavSidebar({
  brand,
  navLabel = "// Navigate",
  items,
  footer,
  showNumbers = true,
}: {
  brand: Brand;
  navLabel?: string;
  items: NavItem[];
  footer?: React.ReactNode;
  // Trailing "01/02" index per item. Reads as unfinished for a single-item
  // nav, so consoles with one destination (the coach console) opt out.
  showNumbers?: boolean;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  if (isMobile) return null;

  // Group items by section in first-seen order. Items without a section fall
  // under the default navLabel, preserving the original flat layout.
  const sections: { label: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const label = item.section ?? navLabel;
    let group = sections.find((s) => s.label === label);
    if (!group) {
      group = { label, items: [] };
      sections.push(group);
    }
    group.items.push(item);
  }

  const renderItem = (item: NavItem, i: number) => {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <SidebarMenuItem key={item.href}>
        <Link
          href={item.href}
          data-active={isActive}
          className="group flex items-center gap-3 border-2 px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground data-[active=false]:border-transparent data-[active=false]:text-foreground data-[active=false]:hover:border-foreground data-[active=false]:hover:bg-foreground data-[active=false]:hover:text-background data-[active=true]:border-foreground data-[active=true]:bg-signal data-[active=true]:text-signal-foreground data-[active=true]:shadow-[3px_3px_0_0_var(--foreground)]"
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} />
          <span>{item.title}</span>
          {showNumbers && (
            <span className="ml-auto font-mono text-[10px] opacity-60">
              {String(i + 1).padStart(2, "0")}
            </span>
          )}
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 h-svh self-start border-r-2 border-foreground"
    >
      <SidebarHeader className="h-14 justify-center gap-0 border-b-2 border-foreground p-0">
        <Link
          href={brand.href}
          className="group flex h-full items-center gap-2.5 px-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground transition-transform group-hover:-translate-y-0.5 group-hover:shadow-[3px_3px_0_0_var(--foreground)]">
            <brand.icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <div className="flex flex-col leading-none">
            <h2
              className="text-lg leading-none tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {brand.title}
            </h2>
            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              {brand.subtitle}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-3 py-4">
        {sections.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <div className="px-2 pb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {group.label}
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {footer && (
        <SidebarFooter className="border-t-2 border-foreground p-3">
          {footer}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
