"use client";

import { PixelButton, PixelCard } from "@/components/pixel";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuthGuard();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-white px-6 text-brand-black">
      {loading || !user ? (
        <p className="font-pixel text-lg font-semibold">Loading…</p>
      ) : (
        <PixelCard className="w-full max-w-md">
          <h1 className="font-pixel text-3xl font-bold">Hi, {user.name || user.email}</h1>
          <p className="mt-3 font-sans text-base text-muted-onPaper">You&apos;re signed in as {user.email}. The chat is coming next.</p>
          <PixelButton variant="secondary" className="mt-6" onClick={signOut}>
            Sign out
          </PixelButton>
        </PixelCard>
      )}
    </main>
  );
}
