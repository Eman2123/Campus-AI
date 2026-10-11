"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/dashboard/AppShell";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { friendlyError } from "@/lib/api";
import {
  type DocumentItem,
  type ScheduleItem,
  type SessionSummary,
  listDocuments,
  listSchedule,
  listSessions,
} from "@/lib/dashboard-api";
import { newSessionId } from "@/lib/dashboard-data";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, token, loading, signOut } = useAuthGuard();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState(newSessionId);

  const refreshSessions = useCallback(async () => {
    if (!token) return;
    try {
      setSessions(await listSessions(token));
      setDataError(null);
    } catch (e) {
      setDataError(friendlyError(e));
    }
  }, [token]);

  const refreshDocs = useCallback(async () => {
    if (!token) return;
    try {
      setDocs(await listDocuments(token));
    } catch (e) {
      setDataError(friendlyError(e));
    }
  }, [token]);

  const refreshSchedule = useCallback(async () => {
    if (!token) return;
    try {
      setSchedule(await listSchedule(token));
    } catch (e) {
      setDataError(friendlyError(e));
    }
  }, [token]);

  useEffect(() => {
    void refreshSessions();
    void refreshDocs();
    void refreshSchedule();
  }, [refreshSessions, refreshDocs, refreshSchedule]);

  // Poll while a document is still being read/embedded.
  const reading = docs.some((d) => d.embedding_status === "pending" || d.embedding_status === "processing");
  useEffect(() => {
    if (!reading) return;
    const id = setInterval(() => void refreshDocs(), 4000);
    return () => clearInterval(id);
  }, [reading, refreshDocs]);

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-white text-brand-black">
        <p className="font-pixel text-lg font-semibold">Loading…</p>
      </main>
    );
  }

  return (
    <DashboardProvider
      value={{
        user,
        token,
        signOut,
        sessions,
        refreshSessions,
        docs,
        refreshDocs,
        schedule,
        refreshSchedule,
        activeSessionId,
        openSession: setActiveSessionId,
        startNewChat: () => setActiveSessionId(newSessionId()),
        dataError,
      }}
    >
      <AppShell>{children}</AppShell>
    </DashboardProvider>
  );
}
