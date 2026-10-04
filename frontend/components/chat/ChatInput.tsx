"use client";

import { useState, type KeyboardEvent } from "react";

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

/**
 * Just the textarea + send button — no outer bar wrapper. ChatWindow
 * renders this alongside VoiceRecorderButton inside one shared input
 * bar, since a mic button bolted onto a second, separate bar would be
 * a worse chat UI than one row with both ways to send a message.
 */
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about your homework, request a quiz, or say 'help me plan for my final on Nov 14'..."
        rows={1}
        className="max-h-40 flex-1 resize-none rounded-sm border border-paper/15 bg-ink-soft px-3 py-2 font-sans text-sm text-paper placeholder:text-muted-onDark focus:border-paper/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="rounded-sm bg-highlighter px-4 py-2 font-sans text-sm font-medium text-ink transition-colors hover:bg-[#f7c563] disabled:opacity-50"
      >
        Send
      </button>
    </>
  );
}
