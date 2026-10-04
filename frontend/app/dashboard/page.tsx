"use client";

import { useState } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { HistorySidebar } from "@/components/chat/HistorySidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { newMessageId } from "@/lib/chat";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function DashboardPage() {
  const { user, token, loading, signOut } = useAuthGuard();
  const [activeSessionId, setActiveSessionId] = useState<string>(() => newMessageId());
  const [historyVersion, setHistoryVersion] = useState(0);
  // Day 33: the sidebar is an off-canvas drawer below `lg` — closed by
  // default there so the chat isn't hidden behind it on first load.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-ink">
        <p className="font-sans text-sm text-muted-onDark">Loading…</p>
      </main>
    );
  }

  if (!user || !token) return null; // useAuthGuard is already redirecting to /signin

  return (
    <main className="flex h-screen flex-col bg-ink">
      <DashboardHeader
        user={user}
        token={token}
        onSignOut={signOut}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <div className="flex min-h-0 flex-1">
        <HistorySidebar
          token={token}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={() => setActiveSessionId(newMessageId())}
          refreshKey={historyVersion}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <ChatWindow
            key={activeSessionId}
            token={token}
            sessionId={activeSessionId}
            onMessageSent={() => setHistoryVersion((v) => v + 1)}
          />
        </div>
      </div>
    </main>
  );
}
