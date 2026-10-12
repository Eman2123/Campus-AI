"use client";

import { createContext, useContext } from "react";

import type { AuthUser } from "@/lib/auth";
import type { DocumentItem, Preferences, ScheduleItem, SessionSummary } from "@/lib/dashboard-api";

export type DashboardCtx = {
  user: AuthUser;
  token: string;
  /** Asks for confirmation first. */
  signOut: () => void;
  /** No prompt — only for after the account has been deleted. */
  forceSignOut: () => void;
  sessions: SessionSummary[];
  refreshSessions: () => Promise<void>;
  docs: DocumentItem[];
  refreshDocs: () => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  schedule: ScheduleItem[];
  refreshSchedule: () => Promise<void>;
  activeSessionId: string;
  openSession: (id: string) => void;
  startNewChat: () => void;
  removeSession: (id: string) => Promise<void>;
  /** Throws on failure so the Settings page can show the message. */
  clearHistory: () => Promise<void>;
  renameUser: (name: string) => Promise<void>;
  prefs: Preferences;
  /** Optimistic: applies at once, rolls back and shows the error banner if the save fails. */
  setPref: (patch: Partial<Preferences>) => Promise<void>;
  dataError: string | null;
};

const Ctx = createContext<DashboardCtx | null>(null);

export const DashboardProvider = Ctx.Provider;

export function useDashboard(): DashboardCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDashboard must be used inside the dashboard layout");
  return value;
}
