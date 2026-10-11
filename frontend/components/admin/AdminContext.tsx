"use client";

import { createContext, useContext } from "react";

import type { AuthUser } from "@/lib/auth";

type AdminCtx = { user: AuthUser; token: string; signOut: () => void };

const Ctx = createContext<AdminCtx | null>(null);

export const AdminProvider = Ctx.Provider;

export function useAdmin(): AdminCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAdmin must be used inside the admin layout");
  return value;
}
