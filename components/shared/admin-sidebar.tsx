"use client";

import Link from "next/link";
import { Shield, Users, Dumbbell, ListChecks, GraduationCap, ArrowLeft } from "lucide-react";
import { NavSidebar, type NavItem } from "@/components/shared/nav-sidebar";

const navItems: NavItem[] = [
  { title: "Users", href: "/admin", icon: Users, exact: true },
  { title: "Trainers", href: "/admin/trainers", icon: GraduationCap },
  { title: "Exercises", href: "/admin/exercises", icon: Dumbbell },
  { title: "Programs", href: "/admin/programs", icon: ListChecks },
];

export function AdminSidebar() {
  return (
    <NavSidebar
      brand={{ href: "/admin", icon: Shield, title: "GYMTRACK", subtitle: "Admin Console" }}
      navLabel="// Admin"
      items={navItems}
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
