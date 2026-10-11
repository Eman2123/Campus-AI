"use client";

import { createContext, useContext } from "react";

import type { AuthUser } from "@/lib/auth";

type DashboardCtx = { user: AuthUser; signOut: () => void };

const Ctx = createContext<DashboardCtx | null>(null);

export const DashboardProvider = Ctx.Provider;

export function useDashboard(): DashboardCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDashboard must be used inside the dashboard layout");
  return value;
}
