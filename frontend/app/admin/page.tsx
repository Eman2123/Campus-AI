"use client";

import { useState } from "react";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { AgentAnalyticsPanel } from "@/components/admin/AgentAnalyticsPanel";
import { ConnectorStatusPanel } from "@/components/admin/ConnectorStatusPanel";
import { useAdminGuard } from "@/lib/useAdminGuard";

const ADMIN_TABS = [
  { id: "users", label: "Users" },
  { id: "analytics", label: "Agent usage" },
  { id: "connectors", label: "Connectors" },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

export default function AdminPage() {
  const { user, token, loading, signOut } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<AdminTabId>("users");

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-ink">
        <p className="font-sans text-sm text-muted-onDark">Loading…</p>
      </main>
    );
  }

  // Either still resolving auth, or useAdminGuard is mid-redirect
  // (no token -> /signin, non-admin -> /dashboard).
  if (!user || !token || user.role !== "admin") return null;

  return (
    <main className="flex h-screen flex-col bg-ink">
      <DashboardHeader user={user} token={token} onSignOut={signOut} />

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mx-auto mb-6 max-w-3xl">
          <p className="font-sans text-sm text-muted-onDark">Admin</p>
          <h1 className="mt-1 font-display text-2xl text-paper">
            {activeTab === "users" ? "Users" : activeTab === "analytics" ? "Agent usage" : "Connector status"}
          </h1>
          <p className="mt-2 font-sans text-sm text-muted-onDark">
            Security pass, deployment, and final docs (Days 38-40) close out the plan.
          </p>

          <div className="mt-4 flex gap-1 border-b border-paper/10">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 font-sans text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-highlighter text-paper"
                    : "text-muted-onDark hover:text-paper"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "users" ? (
          <UserManagementTable token={token} currentUserId={user.id} />
        ) : activeTab === "analytics" ? (
          <AgentAnalyticsPanel token={token} />
        ) : (
          <ConnectorStatusPanel token={token} />
        )}
      </div>
    </main>
  );
}