"use client";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";

import { useAdmin } from "./AdminContext";

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-brand-black px-4 py-3 first:border-0">
      <div>
        <p className="font-semibold">{title}</p>
        {hint && <p className="text-xs text-muted-onPaper">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function AdminSettings() {
  const { user, signOut } = useAdmin();
  return (
    <PixelCard className="p-0">
      <Row title="Name"><span className="text-sm">{user.name || "Not set"}</span></Row>
      <Row title="Email"><span className="text-sm">{user.email}</span></Row>
      <Row title="Role"><PixelBadge tone="yellow">{user.role}</PixelBadge></Row>
      <Row title="Who is an admin" hint="Set in the backend, not here.">
        <span className="text-sm">Add an email to <code className="border-2 border-brand-black bg-brand-yellow-soft px-1.5 text-xs">ADMIN_EMAILS</code> in the backend .env</span>
      </Row>
      <Row title="Sign out on this device">
        <PixelButton size="sm" variant="secondary" onClick={signOut}>Sign out</PixelButton>
      </Row>
    </PixelCard>
  );
}
