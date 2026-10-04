"use client";

import { useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { VoiceRecorderButton } from "@/components/chat/VoiceRecorderButton";
import { ApiError } from "@/lib/api";
import { newMessageId, streamMessage, type ChatMessage } from "@/lib/chat";
import { getSessionMessages } from "@/lib/sessions";
import { sendVoiceMessage } from "@/lib/voice";

type ChatWindowProps = {
  token: string;
  /** Which conversation this is — the dashboard remounts ChatWindow
   * (via a `key={sessionId}` on the parent) whenever the student picks
   * a different one from the history sidebar or starts a new chat, so
   * this component only ever needs to load once per mount. */
  sessionId: string;
  /** Bumps the sidebar's session list after a turn completes, so a
   * brand-new conversation shows up and an existing one moves to the
   * top of "most recent" without the sidebar polling on its own. */
  onMessageSent?: () => void;
};

export function ChatWindow({ token, sessionId, onMessageSent }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pending, setPending] = useState(false);
  // True from send until the first streamed token arrives — drives the
  // "Thinking…" placeholder so it disappears the moment real content
  // starts appearing instead of sitting alongside a growing reply.
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    getSessionMessages(token, sessionId)
      .then((history) => {
        if (cancelled) return;
        setMessages(
          history.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            agentUsed: m.agent_used ?? undefined,
          })),
        );
      })
      .catch((err) => {
        // A brand-new session_id nobody's messaged under yet 404s —
        // that's just "no history", not a real error.
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof ApiError ? err.message : "Couldn't load this conversation's history.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function handleSend(content: string) {
    setError(null);
    setMessages((prev) => [...prev, { id: newMessageId(), role: "user", content }]);
    setPending(true);
    setAwaitingFirstToken(true);

    let assistantId: string | null = null;

    try {
      // Day 30: streamMessage delivers the reply as it's chunked out
      // via SSE instead of waiting for the whole thing — see lib/chat.ts
      // for exactly what that does and doesn't mean here.
      const { agent_used } = await streamMessage(token, sessionId, content, {
        onToken: (chunk) => {
          setAwaitingFirstToken(false);
          setMessages((prev) => {
            if (assistantId === null) {
              assistantId = newMessageId();
              return [...prev, { id: assistantId, role: "assistant", content: chunk }];
            }
            return prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m));
          });
        },
      });

      if (assistantId) {
        const finalId: string = assistantId;
        setMessages((prev) => prev.map((m) => (m.id === finalId ? { ...m, agentUsed: agent_used } : m)));
      }
      onMessageSent?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — please try again.");
    } finally {
      setPending(false);
      setAwaitingFirstToken(false);
    }
  }

  async function handleVoiceRecording(blob: Blob) {
    setError(null);
    setPending(true);

    try {
      // Voice stays non-streaming for now — transcription itself is one
      // blocking round trip before there's even any text to stream, so
      // both bubbles land together once the backend responds, same as
      // before Day 30. The same SSE pattern from handleSend could be
      // reused here later if voice replies turn out long enough to
      // make progressive rendering worthwhile.
      const response = await sendVoiceMessage(token, sessionId, blob);
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "user", content: response.transcript },
        { id: newMessageId(), role: "assistant", content: response.reply, agentUsed: response.agent_used },
      ]);
      onMessageSent?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Voice input failed — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {!loadingHistory && messages.length === 0 && (
          <p className="mx-auto max-w-sm text-center font-sans text-sm text-muted-onDark">
            Ask about a homework problem, request a quiz, or say &ldquo;help me plan for my final on Nov
            14&rdquo; — Campus AI routes it to the right specialist automatically. Type it or use the mic.
          </p>
        )}

        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {pending && awaitingFirstToken && (
          <div className="flex justify-start">
            <div className="rounded-sm bg-paper px-4 py-3 font-sans text-sm text-muted-onPaper">Thinking…</div>
          </div>
        )}

        {error && (
          <p className="text-center font-sans text-sm text-note-coral" role="alert">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-3 border-t border-paper/10 bg-ink px-4 py-4 sm:px-6">
        <ChatInput onSend={handleSend} disabled={pending} />
        <VoiceRecorderButton onComplete={handleVoiceRecording} disabled={pending} />
      </div>
    </div>
  );
}
