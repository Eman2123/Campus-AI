import { apiFetch } from "@/lib/api";

export type SessionSummary = {
  id: string;
  started_at: string;
  last_message_at: string;
  preview: string;
  message_count: number;
};

export type HistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_used: string | null;
  created_at: string;
};

export async function listSessions(token: string): Promise<SessionSummary[]> {
  return apiFetch<SessionSummary[]>("/api/sessions", { token });
}

/**
 * 404s for a session_id nobody's sent a message under yet — that's
 * normal for a freshly-started conversation, not an error. Callers
 * should catch ApiError with status 404 and treat it as "no history".
 */
export async function getSessionMessages(token: string, sessionId: string): Promise<HistoryMessage[]> {
  return apiFetch<HistoryMessage[]>(`/api/sessions/${sessionId}/messages`, { token });
}
