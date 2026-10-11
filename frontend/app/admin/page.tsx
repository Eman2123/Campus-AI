"use client";

import { useState } from "react";

import { AgentsPanel } from "@/components/admin/AgentsPanel";
import { ConnectorsPanel } from "@/components/admin/ConnectorsPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { cn } from "@/lib/cn";
import { useAuthGuard } from "@/lib/useAuthGuard";

const TABS = ["Users", "Agents", "Connectors"] as const;

export default function AdminPage() {
  const { user, token, loading, signOut } = useAuthGuard();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Users");

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
    <div className="min-h-screen bg-brand-white font-sans text-brand-black">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-pixel border-brand-black bg-brand-yellow-soft px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center border-pixel border-brand-black bg-brand-yellow font-pixel text-xl font-bold shadow-pixel-sm">C</span>
          <h1 className="font-pixel text-xl font-bold">Campus AI</h1>
          <PixelBadge tone="black">Admin</PixelBadge>
        </div>
        <div className="flex items-center gap-2">
          <PixelButton size="sm" variant="secondary" href="/dashboard">Dashboard</PixelButton>
          <PixelButton size="sm" variant="dark" onClick={signOut}>Sign out</PixelButton>
        </div>
      </header>

      <main className="bg-graph mx-auto min-h-[calc(100vh-4.5rem)] max-w-5xl px-5 py-6">
        <div className="mb-6 flex w-fit border-pixel border-brand-black">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("px-4 py-2 font-pixel text-sm font-semibold", tab === t ? "bg-brand-black text-brand-white" : "bg-brand-white")}>
              {t}
            </button>
          ))}
        </div>
        {tab === "Users" && <UsersPanel token={token} selfId={user.id} />}
        {tab === "Agents" && <AgentsPanel token={token} />}
        {tab === "Connectors" && <ConnectorsPanel token={token} />}
      </main>
    </div>
  );
}
