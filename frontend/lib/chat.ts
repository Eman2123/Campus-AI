import { apiFetch, ApiError } from "@/lib/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentUsed?: string;
};

type ChatApiResponse = {
  intent: string;
  agent_used: string;
  reply: string;
};

type ChatStreamDone = {
  intent: string;
  agent_used: string;
};

type ChatStreamHandlers = {
  onToken: (content: string) => void;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Calls the real POST /api/chat — the same LangGraph-backed endpoint the
 * backend's own tests drive. `sessionId` becomes the LangGraph thread_id
 * (Day 13's checkpointing), so sending several messages with the same id
 * keeps the agent's own conversational memory intact.
 *
 * Note: this endpoint doesn't persist to the `messages` table (that was
 * never wired up server-side, even though the table's existed since Day
 * 2) — so "message history" here is this browser tab's session state
 * only. A real cross-session history sidebar (Day 31) will need that
 * gap closed on the backend first.
 */
export async function sendMessage(token: string, sessionId: string, message: string): Promise<ChatApiResponse> {
  return apiFetch<ChatApiResponse>("/api/chat", {
    method: "POST",
    token,
    body: { message, session_id: sessionId },
  });
}

/**
 * Consumes POST /api/chat/stream (Day 30) via fetch() + a manual
 * ReadableStream reader — deliberately not the browser's native
 * EventSource. EventSource can only make unauthenticated GET requests
 * (no custom headers, no request body), which doesn't work with our
 * Bearer-token auth or the JSON message body this endpoint needs.
 * Reading the stream by hand via fetch is the standard workaround for
 * authenticated SSE, and it's still real SSE on the wire — just parsed
 * on this end instead of by the browser.
 *
 * Calls `handlers.onToken` as each chunk arrives, then resolves with
 * the final routing info once the backend's "done" event lands. See
 * the backend's chat_stream docstring for what's genuinely streamed
 * here (SSE transport, progressive rendering) vs. simulated (this is
 * chunked delivery of an already-complete reply, not token-by-token
 * LLM generation).
 */
export async function streamMessage(
  token: string,
  sessionId: string,
  message: string,
  handlers: ChatStreamHandlers,
): Promise<ChatStreamDone> {
  const res = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok || !res.body) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") errorMessage = data.detail;
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(errorMessage, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? ""; // the last piece may be an incomplete event — keep it for the next read

    for (const block of blocks) {
      if (!block.trim()) continue;

      let eventName = "message";
      let data: Record<string, unknown> | null = null;
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim();
        } else if (line.startsWith("data:")) {
          data = JSON.parse(line.slice("data:".length).trim());
        }
      }

      if (eventName === "token" && data) {
        handlers.onToken(data.content as string);
      } else if (eventName === "done" && data) {
        return { intent: data.intent as string, agent_used: data.agent_used as string };
      } else if (eventName === "error") {
        throw new ApiError((data?.message as string) ?? "Something went wrong while streaming the reply.", 500);
      }
    }
  }

  throw new ApiError("Stream ended unexpectedly before a final response.", 500);
}

export function newMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
