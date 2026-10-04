"use client";

import { useEffect, useState } from "react";

import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { listSessions, type SessionSummary } from "@/lib/sessions";

type HistorySidebarProps = {
  token: string;
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  /** Bump this after a turn completes elsewhere so the list refetches —
   * see ChatWindow's onMessageSent. */
  refreshKey: number;
  /** Day 33: below the `lg` breakpoint the sidebar is an off-canvas
   * drawer (a fixed 256px column permanently eating most of a phone
   * screen was the single worst responsive bug in the whole frontend —
   * everything else was a matter of degree, this made the chat nearly
   * unusable on mobile). `isOpen`/`onClose` only matter at that width;
   * at `lg` and up the sidebar is always visible and these are unused. */
  isOpen: boolean;
  onClose: () => void;
};

export function HistorySidebar({
  token,
  activeSessionId,
  onSelectSession,
  onNewChat,
  refreshKey,
  isOpen,
  onClose,
}: HistorySidebarProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listSessions(token)
      .then((result) => {
        if (!cancelled) setSessions(result);
      })
      .catch(() => {
        // A failed history fetch shouldn't block chatting — the sidebar
        // just stays empty/stale rather than surfacing its own error UI.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  function selectAndClose(sessionId: string) {
    onSelectSession(sessionId);
    onClose(); // no-op on lg+, but closes the mobile drawer after picking one
  }

  function newChatAndClose() {
    onNewChat();
    onClose();
  }

  return (
    <>
      {/* Backdrop — mobile only, only rendered while the drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col border-r border-paper/10 bg-ink-soft transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={newChatAndClose}
            className="flex-1 rounded-sm border border-paper/20 px-3 py-2 font-sans text-sm text-paper transition-colors hover:border-paper/40"
          >
            + New chat
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-sm border border-paper/20 px-3 py-2 font-sans text-sm text-paper transition-colors hover:border-paper/40 lg:hidden"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {loading && <p className="px-2 py-2 font-sans text-xs text-muted-onDark">Loading…</p>}

          {!loading && sessions.length === 0 && (
            <p className="px-2 py-2 font-sans text-xs text-muted-onDark">
              Past conversations will show up here once you send a message.
            </p>
          )}

          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => selectAndClose(session.id)}
                className={`w-full rounded-sm px-3 py-2 text-left font-sans text-sm transition-colors ${
                  isActive ? "bg-paper text-ink" : "text-muted-onDark hover:bg-ink hover:text-paper"
                }`}
              >
                <p className="truncate">{session.preview || "New conversation"}</p>
                <p className={`mt-0.5 text-xs ${isActive ? "text-muted-onPaper" : "text-muted-onDark"}`}>
                  {session.message_count} message{session.message_count === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>

        <DocumentUploader token={token} />
      </aside>
    </>
  );
}
