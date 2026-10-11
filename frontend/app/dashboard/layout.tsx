"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/dashboard/AppShell";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuthGuard();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-white text-brand-black">
        <p className="font-pixel text-lg font-semibold">Loading…</p>
      </main>
    );
  }

  return (
    <DashboardProvider value={{ user, signOut }}>
      <AppShell>{children}</AppShell>
    </DashboardProvider>
  );
}
