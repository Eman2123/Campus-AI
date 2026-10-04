"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { downloadScheduleIcs } from "@/lib/schedule";

type DashboardHeaderProps = {
  user: AuthUser;
  token: string;
  onSignOut: () => void;
  /** Only the chat page has a sidebar to toggle — the calendar page
   * doesn't pass this, and the hamburger button simply isn't rendered. */
  onToggleSidebar?: () => void;
};

const STUDENT_TABS = [
  { href: "/dashboard", label: "Chat" },
  { href: "/dashboard/calendar", label: "Calendar" },
];

const ADMIN_TAB = { href: "/admin", label: "Admin" };

export function DashboardHeader({ user, token, onSignOut, onToggleSidebar }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [exportError, setExportError] = useState<string | null>(null);

  // Day 34: the Admin tab is a convenience link, not the access control —
  // hiding it from students is just tidiness. The actual gate is
  // require_admin on the backend (and useAdminGuard on /admin itself),
  // so there's nothing to protect by hiding this; a student typing the
  // URL directly still gets redirected straight back to /dashboard.
  const tabs = user.role === "admin" ? [...STUDENT_TABS, ADMIN_TAB] : STUDENT_TABS;

  async function handleExportCalendar() {
    setExportError(null);
    try {
      await downloadScheduleIcs(token);
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : "Couldn't export your calendar right now.");
    }
  }

  return (
    <>
      {/* flex-wrap + gap-y so this degrades to two rows on a narrow
       * screen instead of clipping — a single unbreakable row here was
       * one of the two worst Day 33 responsive bugs (the sidebar being
       * the other). */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-paper/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle conversation history"
              className="rounded-sm border border-paper/20 px-2.5 py-1.5 font-sans text-sm text-paper transition-colors hover:border-paper/40 lg:hidden"
            >
              ☰
            </button>
          )}
          <div>
            <p className="font-display text-lg text-paper">Campus AI</p>
            {/* Email is secondary identification, not needed at the
             * narrowest widths where header space is tightest. */}
            <p className="hidden font-sans text-xs text-muted-onDark sm:block">{user.email}</p>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-sm px-2.5 py-1.5 font-sans text-sm transition-colors sm:px-3 ${
                    isActive ? "bg-paper text-ink" : "text-muted-onDark hover:text-paper"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCalendar}
            className="rounded-sm border border-paper/30 px-3 py-2 font-sans text-sm text-paper transition-colors hover:border-paper/60 sm:px-4"
            title="Download your deadlines and study sessions as a calendar file"
          >
            <span className="hidden sm:inline">Export calendar</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={onSignOut}
            className="rounded-sm border border-paper/30 px-3 py-2 font-sans text-sm text-paper transition-colors hover:border-paper/60 sm:px-4"
          >
            Sign out
          </button>
        </div>
      </header>

      {exportError && (
        <p className="border-b border-paper/10 bg-ink px-4 py-2 text-center font-sans text-xs text-note-coral sm:px-6">
          {exportError}
        </p>
      )}
    </>
  );
}
