"use client";

import { createContext, useContext } from "react";

import type { AuthUser } from "@/lib/auth";
import type { DocumentItem, ScheduleItem, SessionSummary } from "@/lib/dashboard-api";

export type DashboardCtx = {
  user: AuthUser;
  token: string;
  signOut: () => void;
  sessions: SessionSummary[];
  refreshSessions: () => Promise<void>;
  docs: DocumentItem[];
  refreshDocs: () => Promise<void>;
  schedule: ScheduleItem[];
  refreshSchedule: () => Promise<void>;
  activeSessionId: string;
  openSession: (id: string) => void;
  startNewChat: () => void;
  dataError: string | null;
};

const Ctx = createContext<DashboardCtx | null>(null);

export const DashboardProvider = Ctx.Provider;

export function useDashboard(): DashboardCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDashboard must be used inside the dashboard layout");
  return value;
}
