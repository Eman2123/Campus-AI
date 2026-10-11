"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PixelBadge } from "@/components/pixel";
import { cn } from "@/lib/cn";

import { useAdmin } from "./AdminContext";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/connectors", label: "Connectors" },
  { href: "/admin/settings", label: "Settings" },
];

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-pixel text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-onPaper">{sub}</p>
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "pixel-focus whitespace-nowrap border-pixel border-brand-black px-3 py-2 font-pixel text-sm font-semibold shadow-pixel",
        "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-pixel-sm",
        active ? "bg-brand-yellow" : "bg-brand-white",
      )}
    >
      {label}
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAdmin();
  const name = user.name || user.email;

  return (
    <div className="flex h-[100dvh] flex-col bg-brand-white font-sans text-brand-black md:flex-row">
      <nav className="flex gap-2 overflow-x-auto border-b-pixel border-brand-black bg-brand-yellow-soft px-3 py-3 md:hidden">
        {NAV.map((n) => <NavLink key={n.href} {...n} active={pathname === n.href} />)}
      </nav>

      <aside className="hidden w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r-pixel border-brand-black bg-brand-yellow-soft p-4 md:flex">
        <div className="flex items-center gap-2.5 font-pixel text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center border-pixel border-brand-black bg-brand-yellow shadow-pixel-sm">C</span>
          Campus AI
        </div>
        <PixelBadge tone="black" className="self-start">Admin</PixelBadge>
        <nav className="mt-1 flex flex-col gap-2">
          {NAV.map((n) => <NavLink key={n.href} {...n} active={pathname === n.href} />)}
        </nav>
        <Link href="/dashboard" className="pixel-focus mt-1 border-2 border-brand-black bg-brand-white px-3 py-1.5 text-center font-pixel text-xs font-semibold">
          Student dashboard
        </Link>
        <div className="mt-auto flex items-center gap-3 border-t-pixel border-brand-black pt-3">
          <span className="grid h-9 w-9 place-items-center border-pixel border-brand-black bg-accent-coral font-pixel font-bold">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold">{name}</p>
            <button type="button" onClick={signOut} className="text-xs underline">Sign out</button>
          </div>
        </div>
      </aside>

      <div className="bg-graph min-h-0 min-w-0 flex-1">
        <main className="h-full overflow-y-auto">
          <div className="mx-auto max-w-5xl px-5 py-6 pb-16">{children}</div>
        </main>
      </div>
    </div>
  );
}
