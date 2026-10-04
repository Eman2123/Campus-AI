"use client";

import { useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "processing" | "error";

type VoiceRecorderButtonProps = {
  /** Called with the recorded audio once the student stops recording.
   * ChatWindow owns what happens next (upload, add messages, surface
   * errors) — this component only owns the browser recording APIs. */
  onComplete: (blob: Blob) => Promise<void>;
  disabled?: boolean;
};

export function VoiceRecorderButton({ onComplete, disabled }: VoiceRecorderButtonProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    setErrorMessage(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Voice input isn't supported in this browser.");
      setState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setState("processing");
        try {
          await onComplete(blob);
        } finally {
          // Whatever happened, we're not mid-recording anymore. The
          // actual error message (if any) is ChatWindow's to show —
          // this button just stops indicating "processing".
          setState("idle");
        }
      };

      recorder.start();
      setState("recording");
    } catch {
      setErrorMessage("Microphone access was denied or isn't available.");
      setState("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function handleClick() {
    if (state === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        aria-pressed={isRecording}
        aria-label={isRecording ? "Stop recording" : "Record a voice message"}
        title={isRecording ? "Stop recording" : "Record a voice message"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
          isRecording
            ? "animate-pulse border-note-coral bg-note-coral/20 text-note-coral"
            : "border-paper/30 text-paper hover:border-paper/60"
        } disabled:opacity-50`}
      >
        {isProcessing ? <PulseDot /> : <MicIcon />}
      </button>
      {errorMessage && (
        <p className="mt-1 max-w-[8rem] text-center font-sans text-[11px] leading-tight text-note-coral">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function PulseDot() {
  return <span className="h-2.5 w-2.5 animate-ping rounded-full bg-highlighter" />;
}
