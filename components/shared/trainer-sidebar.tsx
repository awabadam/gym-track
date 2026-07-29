"use client";

import Link from "next/link";
import { HeartHandshake, Users, ArrowLeft } from "lucide-react";
import { NavSidebar, type NavItem } from "@/components/shared/nav-sidebar";

const navItems: NavItem[] = [
  { title: "Clients", href: "/clients", icon: Users, exact: true },
];

export function TrainerSidebar() {
  return (
    <NavSidebar
      brand={{ href: "/clients", icon: HeartHandshake, title: "GYMTRACK", subtitle: "Coach Console" }}
      navLabel="// Coaching"
      items={navItems}
      showNumbers={false}
      footer={
        <Link
          href="/"
          className="group flex items-center justify-center gap-2 border-2 border-foreground px-3 py-3.5 text-sm font-bold uppercase tracking-wide transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Exit to app
        </Link>
      }
    />
  );
}
