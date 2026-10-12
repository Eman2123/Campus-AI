import { API_BASE_URL, ApiError, apiFetch, handleSessionExpired } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";

export type SessionSummary = {
  id: string;
  started_at: string;
  last_message_at: string;
  preview: string;
  message_count: number;
};

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  agent_used: string | null;
  created_at: string;
};

export type EmbeddingStatus = "pending" | "processing" | "ready" | "failed";

export type DocumentItem = {
  id: string;
  filename: string;
  embedding_status: EmbeddingStatus;
  subject: string | null;
  organize_status: string;
  created_at: string;
};

export type ScheduleItem = {
  id: string;
  title: string;
  due_date: string;
  source: "deadline" | "study_session";
  created_at: string;
};

export type VoiceReply = { transcript: string; intent: string; agent_used: string; reply: string };

export const listSessions = (token: string) => apiFetch<SessionSummary[]>("/api/sessions", { token });
export const getSessionMessages = (token: string, id: string) =>
  apiFetch<ChatMessage[]>(`/api/sessions/${id}/messages`, { token });
export const listDocuments = (token: string) => apiFetch<DocumentItem[]>("/api/documents", { token });
export const deleteDocument = (token: string, id: string) =>
  apiFetch<void>(`/api/documents/${id}`, { method: "DELETE", token });
export const listSchedule = (token: string) => apiFetch<ScheduleItem[]>("/api/schedule", { token });
export const remindMe = (token: string) =>
  apiFetch<{ reminders_sent: number }>("/api/schedule/remind-me", { method: "POST", token });
export const digestMe = (token: string) =>
  apiFetch<{ digests_sent: number }>("/api/schedule/digest-me", { method: "POST", token });

/** apiFetch always sends JSON, so file uploads and streams use fetch directly. */
async function failure(res: Response): Promise<ApiError> {
  let message = `Request failed with status ${res.status}`;
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") message = data.detail;
  } catch {
    // not JSON; keep the generic message
  }
  return new ApiError(message, res.status);
}

async function send(path: string, init: RequestInit, token: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 401) handleSessionExpired();
  if (!res.ok) throw await failure(res);
  return res;
}

export async function uploadDocument(token: string, file: File): Promise<DocumentItem> {
  const form = new FormData();
  form.append("file", file);
  const res = await send("/api/documents/upload", { method: "POST", body: form }, token);
  return (await res.json()) as DocumentItem;
}

export async function downloadIcs(token: string): Promise<void> {
  const res = await send("/api/schedule/export.ics", {}, token);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "campus-ai-schedule.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export async function sendVoice(token: string, audio: Blob, sessionId: string): Promise<VoiceReply> {
  const form = new FormData();
  form.append("audio", audio, "voice.webm");
  form.append("session_id", sessionId);
  const res = await send("/api/voice/chat", { method: "POST", body: form }, token);
  return (await res.json()) as VoiceReply;
}

/** Dictation: audio in, text out (nothing is sent to the agents). */
export async function transcribeVoice(token: string, audio: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audio, "voice.webm");
  const res = await send("/api/voice/transcribe", { method: "POST", body: form }, token);
  return ((await res.json()) as { transcript: string }).transcript;
}

/** Text-to-speech (ElevenLabs on the server). Resolves to an MP3 blob. */
export async function speakText(token: string, text: string): Promise<Blob> {
  const res = await send(
    "/api/voice/speak",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) },
    token,
  );
  return await res.blob();
}

type StreamHandlers = {
  onToken: (chunk: string) => void;
  onDone: (agentUsed: string) => void;
  onError: (message: string) => void;
};

/**
 * POST /api/chat/stream and read the server-sent events by hand (EventSource
 * can't send an Authorization header). Never throws: failures go to onError.
 */
export async function streamChat(token: string, message: string, sessionId: string, h: StreamHandlers): Promise<void> {
  try {
    const res = await send(
      "/api/chat/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
      },
      token,
    );
    if (!res.body) throw new ApiError("The server sent an empty response.", 0);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handle = (block: string) => {
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) return;
      const payload = JSON.parse(data) as { content?: string; message?: string; agent_used?: string };
      if (event === "token" && payload.content) h.onToken(payload.content);
      else if (event === "done") h.onDone(payload.agent_used ?? "");
      else if (event === "error") h.onError(payload.message ?? "Something went wrong generating a response.");
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        handle(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
      }
    }
  } catch (err) {
    if (err instanceof ApiError) {
      h.onError(err.status === 429 ? "Too many messages. Wait a minute and try again." : err.message);
    } else {
      h.onError("Something went wrong. Please try again.");
    }
  }
}

/* ---- Settings: name, preferences, chat history, account ---- */

export type Preferences = {
  reminders_enabled: boolean;
  remind_hours: number;
  digest_enabled: boolean;
  digest_days: number;
  drive_upload: boolean;
  week_starts_on: "Monday" | "Sunday";
  reduce_motion: boolean;
  typewriter: boolean;
  voice_input: boolean;
};

/** Mirrors the backend defaults (app/schemas/preferences.py) until the real values load. */
export const DEFAULT_PREFS: Preferences = {
  reminders_enabled: true,
  remind_hours: 48,
  digest_enabled: true,
  digest_days: 7,
  drive_upload: true,
  week_starts_on: "Monday",
  reduce_motion: false,
  typewriter: true,
  voice_input: true,
};

export const getPreferences = (token: string) => apiFetch<Preferences>("/api/auth/me/preferences", { token });
export const updatePreferences = (token: string, patch: Partial<Preferences>) =>
  apiFetch<Preferences>("/api/auth/me/preferences", { method: "PATCH", token, body: patch });
export const updateName = (token: string, name: string) =>
  apiFetch<AuthUser>("/api/auth/me", { method: "PATCH", token, body: { name } });
export const deleteSession = (token: string, id: string) =>
  apiFetch<void>(`/api/sessions/${id}`, { method: "DELETE", token });
export const clearSessions = (token: string) => apiFetch<void>("/api/sessions", { method: "DELETE", token });
export const deleteAccount = (token: string, confirmEmail: string) =>
  apiFetch<void>("/api/auth/me", { method: "DELETE", token, body: { confirm_email: confirmEmail } });
