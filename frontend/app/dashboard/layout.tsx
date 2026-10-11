"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/dashboard/AppShell";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { friendlyError } from "@/lib/api";
import {
  DEFAULT_PREFS,
  type DocumentItem,
  type Preferences,
  type ScheduleItem,
  type SessionSummary,
  clearSessions,
  deleteDocument,
  deleteSession,
  getPreferences,
  updateName,
  updatePreferences,
  listDocuments,
  listSchedule,
  listSessions,
} from "@/lib/dashboard-api";
import { newSessionId } from "@/lib/dashboard-data";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, setUser, token, loading, signOut } = useAuthGuard();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState(newSessionId);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

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

  const removeDocument = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await deleteDocument(token, id);
        await refreshDocs();
      } catch (e) {
        setDataError(friendlyError(e));
      }
    },
    [token, refreshDocs],
  );

  const refreshSchedule = useCallback(async () => {
    if (!token) return;
    try {
      setSchedule(await listSchedule(token));
    } catch (e) {
      setDataError(friendlyError(e));
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getPreferences(token).then(setPrefs).catch(() => undefined); // fall back to defaults
  }, [token]);

  const setPref = useCallback(
    async (patch: Partial<Preferences>) => {
      if (!token) return;
      const previous = prefs;
      setPrefs({ ...prefs, ...patch });
      try {
        setPrefs(await updatePreferences(token, patch));
      } catch (e) {
        setPrefs(previous);
        setDataError(friendlyError(e));
      }
    },
    [token, prefs],
  );

  const removeSession = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await deleteSession(token, id);
        if (id === activeSessionId) setActiveSessionId(newSessionId());
        await refreshSessions();
      } catch (e) {
        setDataError(friendlyError(e));
      }
    },
    [token, activeSessionId, refreshSessions],
  );

  const clearHistory = useCallback(async () => {
    if (!token) return;
    await clearSessions(token);
    setActiveSessionId(newSessionId());
    await refreshSessions();
  }, [token, refreshSessions]);

  const renameUser = useCallback(
    async (name: string) => {
      if (!token) return;
      setUser(await updateName(token, name));
    },
    [token, setUser],
  );

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
        removeDocument,
        schedule,
        refreshSchedule,
        activeSessionId,
        openSession: setActiveSessionId,
        startNewChat: () => setActiveSessionId(newSessionId()),
        removeSession,
        clearHistory,
        renameUser,
        prefs,
        setPref,
        dataError,
      }}
    >
      <AppShell>{children}</AppShell>
    </DashboardProvider>
  );
}
