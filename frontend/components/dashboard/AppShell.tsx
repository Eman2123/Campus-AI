"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PixelBadge, PixelButton } from "@/components/pixel";
import { docBadge } from "@/lib/dashboard-data";
import { cn } from "@/lib/cn";

import { useDashboard } from "./DashboardContext";

const BASE_NAV = [
  { href: "/dashboard", label: "Chat" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/settings", label: "Settings" },
];

const ADMIN_NAV = { href: "/admin", label: "Admin" };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, sessions, docs, activeSessionId, openSession, startNewChat, dataError } = useDashboard();
  const displayName = user.name || user.email;
  const NAV = user.role === "admin" ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV;

  return (
    <div className="flex h-[100dvh] flex-col bg-brand-white font-sans text-brand-black md:flex-row">
      {/* Mobile nav */}
      <nav className="flex gap-2 overflow-x-auto border-b-pixel border-brand-black bg-brand-yellow-soft px-3 py-2 md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "pixel-focus border-pixel border-brand-black px-3 py-1.5 font-pixel text-sm font-semibold",
              pathname === n.href ? "bg-brand-yellow shadow-pixel-sm" : "bg-brand-white",
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r-pixel border-brand-black bg-brand-yellow-soft p-4 md:flex">
        <div className="flex items-center gap-2.5 font-pixel text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center border-pixel border-brand-black bg-brand-yellow shadow-pixel-sm">C</span>
          Campus AI
        </div>

        <nav className="flex flex-col gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "pixel-focus border-pixel border-brand-black px-3 py-2 font-pixel text-sm font-semibold",
                pathname === n.href
                  ? "bg-brand-yellow shadow-pixel-sm"
                  : "bg-brand-white hover:bg-brand-yellow-soft",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {pathname === "/dashboard" && (
          <>
            <PixelButton size="sm" variant="dark" onClick={startNewChat}>+ New chat</PixelButton>
            <p className="mt-2 font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Chats</p>
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-onPaper">No past chats yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {sessions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openSession(c.id)}
                      className={cn(
                        "w-full truncate border-2 px-2.5 py-2 text-left text-sm",
                        c.id === activeSessionId ? "border-brand-black bg-brand-white font-semibold shadow-pixel-sm" : "border-transparent hover:border-brand-black",
                      )}
                    >
                      {c.preview}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-2 font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Your documents</p>
            {docs.length === 0 ? (
              <p className="text-xs text-muted-onPaper">Nothing uploaded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {docs.map((d) => {
                  const b = docBadge(d.embedding_status);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-2 border-2 border-brand-black bg-brand-white px-2 py-1.5 text-xs">
                      <span className="truncate">{d.filename}</span>
                      <PixelBadge tone={b.tone}>{b.label}</PixelBadge>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <div className="mt-auto flex items-center gap-3 border-t-pixel border-brand-black pt-3">
          <span className="grid h-9 w-9 place-items-center border-pixel border-brand-black bg-accent-coral font-pixel font-bold">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold">{displayName}</p>
            <button type="button" onClick={signOut} className="text-xs underline">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {dataError && (
          <p role="alert" className="border-b-pixel border-brand-black bg-accent-coral px-4 py-1.5 text-xs font-semibold">
            {dataError}
          </p>
        )}
        <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
