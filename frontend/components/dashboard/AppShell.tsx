"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { PixelBadge, PixelButton, PixelIcon } from "@/components/pixel";
import { docBadge } from "@/lib/dashboard-data";
import { cn } from "@/lib/cn";
import { useDarkMode } from "@/lib/theme";

import { DocDeleteButton } from "./DocDeleteButton";
import { useDashboard } from "./DashboardContext";

const BASE_NAV = [
  { href: "/dashboard/home", label: "Home" },
  { href: "/dashboard", label: "Chat" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/settings", label: "Settings" },
];

const ADMIN_NAV = { href: "/admin", label: "Admin" };

/**
 * Desktop layout choices for the chat page: the left sidebar and the right
 * Documents/Plan panel can each be hidden so the conversation gets the room.
 * Remembered per browser; mobile has its own drawers and ignores this.
 */
type ShellLayout = {
  sidebarOpen: boolean;
  panelOpen: boolean;
  toggleSidebar: () => void;
  togglePanel: () => void;
  /** Both hidden: the chat takes the whole window. */
  focus: boolean;
  toggleFocus: () => void;
};

const ShellLayoutContext = createContext<ShellLayout | null>(null);

export function useShellLayout(): ShellLayout {
  const ctx = useContext(ShellLayoutContext);
  if (!ctx) throw new Error("useShellLayout must be used inside <AppShell>");
  return ctx;
}

const SIDEBAR_KEY = "campus-ai.sidebar";
const PANEL_KEY = "campus-ai.panel";

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* private mode or blocked storage: the choice just is not remembered */
  }
}

function SidebarLists({ onNavigate }: { onNavigate?: () => void }) {
  const { sessions, docs, activeSessionId, openSession, startNewChat, removeSession } = useDashboard();
  return (
    <>
      <PixelButton
        size="sm"
        variant="dark"
        onClick={() => {
          startNewChat();
          onNavigate?.();
        }}
      >
        + New chat
      </PixelButton>
      <p className="mt-2 font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Chats</p>
      {sessions.length === 0 ? (
        <p className="text-xs text-muted-onPaper">No past chats yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sessions.map((c) => (
            <li key={c.id} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => {
                  openSession(c.id);
                  onNavigate?.();
                }}
                className={cn(
                  "min-w-0 flex-1 truncate border-2 px-2.5 py-2 text-left text-sm",
                  c.id === activeSessionId ? "border-brand-black bg-brand-white font-semibold shadow-pixel-sm" : "border-transparent hover:border-brand-black",
                )}
              >
                {c.preview}
              </button>
              <button
                type="button"
                aria-label={`Delete chat: ${c.preview}`}
                title="Delete chat"
                onClick={() => {
                  if (window.confirm("Delete this chat? This cannot be undone.")) void removeSession(c.id);
                }}
                className="pixel-focus shrink-0 border-2 border-transparent p-1 transition-colors hover:border-brand-black hover:bg-accent-coral"
              >
                <PixelIcon name="close" size={14} />
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
                <span className="flex shrink-0 items-center gap-1.5">
                  <PixelBadge tone={b.tone}>{b.label}</PixelBadge>
                  <DocDeleteButton id={d.id} filename={d.filename} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, dataError, prefs } = useDashboard();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const dark = useDarkMode();
  const displayName = user.name || user.email;
  const NAV = user.role === "admin" ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV;
  const onChat = pathname === "/dashboard";

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Read the saved choices after mount so server and first client render agree.
  useEffect(() => {
    setSidebarOpen(readFlag(SIDEBAR_KEY, true));
    setPanelOpen(readFlag(PANEL_KEY, false));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => {
      writeFlag(SIDEBAR_KEY, !v);
      return !v;
    });
  }, []);
  const togglePanel = useCallback(() => {
    setPanelOpen((v) => {
      writeFlag(PANEL_KEY, !v);
      return !v;
    });
  }, []);
  const focus = !sidebarOpen && !panelOpen;
  const toggleFocus = useCallback(() => {
    const next = !(!sidebarOpen && !panelOpen);
    // Entering focus hides both; leaving it brings back the sidebar only.
    setSidebarOpen(!next);
    setPanelOpen(false);
    writeFlag(SIDEBAR_KEY, !next);
    writeFlag(PANEL_KEY, false);
  }, [sidebarOpen, panelOpen]);
  const layout = useMemo(
    () => ({ sidebarOpen, panelOpen, toggleSidebar, togglePanel, focus, toggleFocus }),
    [sidebarOpen, panelOpen, toggleSidebar, togglePanel, focus, toggleFocus],
  );
  const showSidebar = !onChat || sidebarOpen;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <ShellLayoutContext.Provider value={layout}>
    <div className={cn("flex h-[100dvh] flex-col bg-brand-white font-sans text-brand-black md:flex-row", dark && "app-dark", prefs.reduce_motion && "reduce-motion")}>
      {/* Mobile nav */}
      <nav className="flex gap-2 overflow-x-auto border-b-pixel border-brand-black bg-brand-yellow-soft px-3 py-2 md:hidden">
        {onChat && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open chats and documents"
            aria-expanded={drawerOpen}
            className="pixel-focus inline-flex shrink-0 items-center gap-2 border-pixel border-brand-black bg-brand-black px-3 py-1.5 font-pixel text-sm font-semibold text-brand-white"
          >
            <PixelIcon name="menu" />
            Chats
          </button>
        )}
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
        <button
          type="button"
          onClick={signOut}
          className="pixel-focus ml-auto shrink-0 border-pixel border-brand-black bg-brand-white px-3 py-1.5 font-pixel text-sm font-semibold"
        >
          Sign out
        </button>
      </nav>

      {/* Mobile drawer: chats + documents */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Chats and documents">
          <div className="flex w-[85%] max-w-xs flex-col gap-3 overflow-y-auto border-r-pixel border-brand-black bg-brand-yellow-soft p-4">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-lg font-bold">Campus AI</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="pixel-focus border-pixel border-brand-black bg-brand-white p-2 transition-colors hover:bg-accent-coral">
                <PixelIcon name="close" />
              </button>
            </div>
            <SidebarLists onNavigate={() => setDrawerOpen(false)} />
          </div>
          <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="flex-1 bg-brand-black/50" />
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn("hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r-pixel border-brand-black bg-brand-yellow-soft p-4", showSidebar && "md:flex")}>
        <div className="flex items-center gap-2.5 font-pixel text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center border-pixel border-brand-black bg-brand-yellow shadow-pixel-sm">C</span>
          <span className="min-w-0 flex-1 truncate">Campus AI</span>
          {onChat && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Hide sidebar"
              title="Hide sidebar"
              className="pixel-focus shrink-0 border-2 border-brand-black bg-brand-white px-2 py-0.5 text-sm hover:bg-brand-yellow"
            >
              «
            </button>
          )}
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
            <SidebarLists />
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
    </ShellLayoutContext.Provider>
  );
}
