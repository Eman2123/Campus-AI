"use client";

import type { ReactNode } from "react";

import { AdminProvider } from "@/components/admin/AdminContext";
import { AdminShell } from "@/components/admin/AdminShell";
import { PixelButton, PixelCard } from "@/components/pixel";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, token, loading, signOut } = useAuthGuard();

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-white text-brand-black">
        <p className="font-pixel text-lg font-semibold">Loading…</p>
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-white px-6 text-brand-black">
        <PixelCard className="max-w-md">
          <h1 className="font-pixel text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm">Your account doesn&apos;t have access to this page.</p>
          <PixelButton href="/dashboard" className="mt-4">Back to dashboard</PixelButton>
        </PixelCard>
      </main>
    );
  }

  return (
    <AdminProvider value={{ user, token, signOut }}>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
