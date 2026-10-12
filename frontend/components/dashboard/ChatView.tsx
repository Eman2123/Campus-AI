"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { getSessionMessages, sendVoice, speakText, streamChat, transcribeVoice, uploadDocument } from "@/lib/dashboard-api";
import { STARTERS, SUGGESTIONS, dayLabel, docBadge, startOfDay, toEvents } from "@/lib/dashboard-data";
import { cn } from "@/lib/cn";

import { DocDeleteButton } from "./DocDeleteButton";
import { Markdown } from "./Markdown";
import { useDashboard } from "./DashboardContext";

type Msg = { key: string; role: "user" | "assistant"; content: string; agent?: string | null; error?: boolean };

const DAY_MS = 86_400_000;

type VoiceMode = "dictate" | "talk";

/** Strip markdown so the voice reads words, not symbols. */
function plainForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4500);
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function PanelContent({ onPickFile }: { onPickFile: () => void }) {
  const { docs, schedule } = useDashboard();
  const [tab, setTab] = useState<"Documents" | "Plan">("Documents");
  const today = startOfDay(new Date());
  const events = toEvents(schedule);
  const week = Array.from({ length: 7 }, (_, k) => new Date(today.getTime() + k * DAY_MS));
  const upcoming = events.filter((e) => e.at >= today && e.at.getTime() < today.getTime() + 7 * DAY_MS);

  return (
    <>
      <div className="grid grid-cols-2 border-pixel border-brand-black">
        {(["Documents", "Plan"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("py-2 font-pixel text-sm font-semibold", tab === t ? "bg-brand-black text-brand-white" : "bg-brand-white")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Documents" && (
        <>
          {docs.length === 0 && <p className="text-xs text-muted-onPaper">Upload a PDF and ask questions about it.</p>}
          {docs.map((d) => {
            const b = docBadge(d.embedding_status);
            return (
              <div key={d.id} className="border-2 border-brand-black bg-brand-white p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{d.filename}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <PixelBadge tone={b.tone}>{b.label}</PixelBadge>
                    <DocDeleteButton id={d.id} filename={d.filename} />
                  </span>
                </div>
                {d.subject && <p className="mt-1 text-muted-onPaper">{d.subject}</p>}
                {b.label === "Reading" && (
                  <div className="mt-2 h-3.5 border-2 border-brand-black bg-brand-white">
                    <div className="h-full w-1/2 bg-[repeating-linear-gradient(-45deg,#171717_0_6px,#FACC15_6px_12px)]" />
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={onPickFile} className="border-2 border-dashed border-brand-black p-4 text-center text-xs text-muted-onPaper hover:bg-brand-white">
            Upload a PDF
            <br />
            or browse your files
          </button>
        </>
      )}

      {tab === "Plan" && (
        <>
          <p className="font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Next 7 days</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {week.map((d, k) => {
              const has = upcoming.some((e) => startOfDay(e.at).getTime() === d.getTime());
              return (
                <div key={k}>
                  {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                  <span className={cn("block border-2 border-brand-black py-1 text-sm", k === 0 ? "bg-brand-yellow" : "bg-brand-white")}>{d.getDate()}</span>
                  <i className={cn("mx-auto mt-0.5 block h-1.5 w-1.5", has ? "bg-accent-coral" : "bg-transparent")} />
                </div>
              );
            })}
          </div>
          {upcoming.length === 0 && <p className="text-xs text-muted-onPaper">Nothing due this week. Ask the planner to build a study plan.</p>}
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 border-2 border-brand-black bg-brand-white px-2 py-1.5 text-xs">
              <span className="truncate">{e.title}</span>
              <small className="shrink-0">{dayLabel(e.at)}</small>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function RightPanel({ onPickFile }: { onPickFile: () => void }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l-pixel border-brand-black bg-brand-yellow-soft p-4 lg:flex">
      <PanelContent onPickFile={onPickFile} />
    </aside>
  );
}

function MobilePanel({ open, onClose, onPickFile }: { open: boolean; onClose: () => void; onPickFile: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden" role="dialog" aria-modal="true" aria-label="Documents and plan">
      <button type="button" aria-label="Close panel" onClick={onClose} className="flex-1 bg-brand-black/50" />
      <div className="flex max-h-[80dvh] flex-col gap-3 overflow-y-auto border-t-pixel border-brand-black bg-brand-yellow-soft p-4">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close panel" className="pixel-focus border-pixel border-brand-black bg-brand-white px-2.5 py-1 font-pixel text-sm font-bold">
            ✕
          </button>
        </div>
        <PanelContent onPickFile={onPickFile} />
      </div>
    </div>
  );
}

export function ChatView() {
  const { token, sessions, activeSessionId, refreshSessions, refreshDocs, refreshSchedule, schedule, prefs } = useDashboard();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const modeRef = useRef<VoiceMode>("dictate");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Opening a past chat loads its transcript; a brand-new chat starts empty.
  useEffect(() => {
    let cancelled = false;
    setNote("");
    if (!sessionsRef.current.some((s) => s.id === activeSessionId)) {
      setMsgs([]);
      return;
    }
    setLoadingMsgs(true);
    getSessionMessages(token, activeSessionId)
      .then((rows) => {
        if (!cancelled) setMsgs(rows.map((r) => ({ key: r.id, role: r.role === "user" ? "user" : "assistant", content: r.content, agent: r.agent_used })));
      })
      .catch((e) => !cancelled && setNote(friendlyError(e)))
      .finally(() => !cancelled && setLoadingMsgs(false));
    return () => {
      cancelled = true;
    };
  }, [activeSessionId, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  useEffect(() => () => audioRef.current?.pause(), []);

  async function say(raw: string) {
    const value = raw.trim();
    if (!value || busy) return;
    setText("");
    setNote("");
    setBusy(true);
    const stamp = Date.now();
    const aKey = `a${stamp}`;
    setMsgs((m) => [...m, { key: `u${stamp}`, role: "user", content: value }, { key: aKey, role: "assistant", content: "" }]);
    // Settings -> Typewriter replies: when off, hold the text back and show it whole at the end.
    let held = "";
    await streamChat(token, value, activeSessionId, {
      onToken: (c) => {
        if (prefs.typewriter) setMsgs((m) => m.map((x) => (x.key === aKey ? { ...x, content: x.content + c } : x)));
        else held += c;
      },
      onDone: (agent) => setMsgs((m) => m.map((x) => (x.key === aKey ? { ...x, agent, content: held || x.content } : x))),
      onError: (msg) => setMsgs((m) => m.map((x) => (x.key === aKey ? { ...x, content: msg, error: true } : x))),
    });
    setBusy(false);
    void refreshSessions();
    void refreshSchedule(); // the planner agent may have added deadlines
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNote(`Uploading ${file.name}…`);
    try {
      await uploadDocument(token, file);
      setNote(`${file.name} uploaded. It is being read now.`);
      await refreshDocs();
    } catch (err) {
      setNote(friendlyError(err));
    }
  }

  function stopSpeaking() {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeakingKey(null);
  }

  async function speak(key: string, text: string) {
    if (speakingKey === key) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    setSpeakingKey(key);
    try {
      const blob = await speakText(token, plainForSpeech(text));
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      const done = () => {
        URL.revokeObjectURL(url);
        setSpeakingKey((k) => (k === key ? null : k));
      };
      audio.onended = done;
      audio.onerror = done;
      await audio.play();
    } catch (err) {
      setSpeakingKey(null);
      setNote(friendlyError(err));
    }
  }

  async function copyMessage(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      setNote("Could not copy. Select the text and copy it by hand.");
    }
  }

  /**
   * Two ways to use the microphone:
   * - "dictate": your voice becomes text in the box; you review it and press send.
   * - "talk": a voice conversation. The agents answer and the reply is read aloud.
   */
  async function toggleVoice(mode: VoiceMode) {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    stopSpeaking();
    modeRef.current = mode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        try {
          if (modeRef.current === "dictate") {
            const transcript = await transcribeVoice(token, blob);
            setText((t) => (t ? `${t} ${transcript}` : transcript));
            inputRef.current?.focus();
          } else {
            const r = await sendVoice(token, blob, activeSessionId);
            const stamp = Date.now();
            const aKey = `a${stamp}`;
            setMsgs((m) => [...m, { key: `u${stamp}`, role: "user", content: r.transcript }, { key: aKey, role: "assistant", content: r.reply, agent: r.agent_used }]);
            void refreshSessions();
            void refreshSchedule();
            void speak(aKey, r.reply);
          }
        } catch (err) {
          setNote(friendlyError(err));
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setNote("Microphone is not available. Check the browser permission.");
    }
  }

  function starter(agent: string) {
    setText(STARTERS[agent] ?? "");
    inputRef.current?.focus();
  }

  const title = sessions.find((s) => s.id === activeSessionId)?.preview ?? "New chat";
  const lastAgent = [...msgs].reverse().find((m) => m.role === "assistant" && m.agent)?.agent;
  const now = new Date();
  const nextDeadline = toEvents(schedule).find((e) => e.kind === "deadline" && e.at >= startOfDay(now));
  const days = nextDeadline ? Math.round((startOfDay(nextDeadline.at).getTime() - startOfDay(now).getTime()) / DAY_MS) : null;
  const lastIdx = msgs.length - 1;

  return (
    <>
      <section className="bg-graph flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b-pixel border-brand-black bg-brand-white px-5 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-pixel text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-onPaper">{lastAgent ? `Answered by the ${lastAgent} agent` : "The right agent is picked from your message"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {nextDeadline && days !== null && (
              <PixelBadge tone="coral">{nextDeadline.title}: {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}</PixelBadge>
            )}
            <PixelButton size="sm" variant="secondary" className="lg:hidden" onClick={() => setPanelOpen(true)}>
              Docs / Plan
            </PixelButton>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b-pixel border-brand-black bg-brand-yellow-soft px-5 py-3">
          <span className="font-pixel text-sm">Start with</span>
          {Object.keys(STARTERS).map((a) => (
            <button key={a} type="button" onClick={() => starter(a)} className="pixel-focus border-2 border-brand-black bg-brand-white px-3 py-1 font-pixel text-xs font-semibold hover:bg-accent-mint">
              {a}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-4 px-5 pb-2 pt-5">
            {loadingMsgs && <p className="text-sm text-muted-onPaper">Loading chat…</p>}
            {!loadingMsgs && msgs.length === 0 && (
              <PixelCard tone="soft" className="max-w-xl text-sm">
                <p className="font-pixel text-lg font-bold">Ask about your coursework</p>
                <p className="mt-1">Upload a PDF, then ask for a quiz, flashcards, a summary or a study plan. Pick a starter above or just type.</p>
              </PixelCard>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={m.key} className="max-w-[80%] self-end whitespace-pre-wrap bg-brand-black px-3.5 py-2 text-sm text-brand-white">{m.content}</div>
              ) : (
                <div key={m.key} className="max-w-xl">
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="grid h-7 w-7 place-items-center border-2 border-brand-black bg-brand-yellow font-pixel">:)</span>
                    <b className="font-pixel">Campus AI</b>
                    {m.agent && <PixelBadge tone="mint">{m.agent}</PixelBadge>}
                  </div>
                  <PixelCard className={cn("px-4 py-3 text-sm", m.error && "bg-accent-coral")}>
                    {!m.content ? (
                      <span className="text-muted-onPaper">Thinking…</span>
                    ) : m.error ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <Markdown>{m.content}</Markdown>
                    )}
                  </PixelCard>
                  {m.content && !m.error && (
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => void copyMessage(m.key, m.content)}
                        aria-label="Copy reply"
                        title="Copy"
                        className="pixel-focus border-2 border-transparent px-1.5 py-0.5 text-xs hover:border-brand-black hover:bg-brand-white"
                      >
                        {copiedKey === m.key ? "Copied ✓" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void speak(m.key, m.content)}
                        aria-label={speakingKey === m.key ? "Stop reading" : "Read aloud"}
                        title={speakingKey === m.key ? "Stop" : "Read aloud"}
                        className="pixel-focus border-2 border-transparent px-1.5 py-0.5 text-xs hover:border-brand-black hover:bg-brand-white"
                      >
                        {speakingKey === m.key ? "■ Stop" : "🔊 Read aloud"}
                      </button>
                    </div>
                  )}
                  {i === lastIdx && !busy && m.content && !m.error && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PixelButton size="sm" variant="secondary" onClick={() => say("Make flashcards from this.")}>Make flashcards</PixelButton>
                      <PixelButton size="sm" variant="secondary" onClick={() => say("Explain it simpler.")}>Explain it simpler</PixelButton>
                      <PixelButton size="sm" onClick={() => say("Add this to my study plan.")}>Add to plan</PixelButton>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          <div className="sticky bottom-0 bg-gradient-to-b from-transparent to-brand-white px-5 pb-4 pt-4">
            {note && <p role="status" className="mb-2 text-xs text-muted-onPaper">{note}</p>}
            <div className="mb-2.5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <PixelButton key={s} size="sm" variant="secondary" disabled={busy} onClick={() => say(s)}>{s}</PixelButton>
              ))}
            </div>
            <form
              className="flex items-center gap-2 border-pixel border-brand-black bg-brand-white p-2 shadow-pixel"
              onSubmit={(e) => {
                e.preventDefault();
                void say(text);
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onFile} />
              <PixelButton size="sm" variant="secondary" aria-label="Attach file" onClick={() => fileRef.current?.click()}>
                <Icon d="M21 12.5l-8.5 8.5a5.5 5.5 0 01-8-8l9-9a3.5 3.5 0 015 5l-9 9a1.5 1.5 0 01-2-2l8-8" />
              </PixelButton>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={4000}
                placeholder={recording ? "Recording… press the button again to stop" : "Ask anything about your notes…"}
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              {(prefs.voice_input || recording) && (
                <>
                  <PixelButton
                    size="sm"
                    variant={recording && modeRef.current === "dictate" ? "primary" : "secondary"}
                    aria-label={recording && modeRef.current === "dictate" ? "Stop dictating" : "Dictate: speak and get text"}
                    title="Dictate: your voice becomes text"
                    disabled={(busy && !recording) || (recording && modeRef.current !== "dictate")}
                    onClick={() => void toggleVoice("dictate")}
                  >
                    <Icon d="M9 3h6v12H9zM5 11a7 7 0 0014 0M12 18v3" />
                  </PixelButton>
                  <PixelButton
                    size="sm"
                    variant={recording && modeRef.current === "talk" ? "primary" : "secondary"}
                    aria-label={recording && modeRef.current === "talk" ? "Stop and send" : "Talk: voice conversation"}
                    title="Talk: the agent answers out loud"
                    disabled={(busy && !recording) || (recording && modeRef.current !== "talk")}
                    onClick={() => void toggleVoice("talk")}
                  >
                    <Icon d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
                  </PixelButton>
                </>
              )}
              <PixelButton size="sm" type="submit" aria-label="Send" disabled={busy || !text.trim()}>→</PixelButton>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-onPaper">Campus AI can make mistakes. Check important info.</p>
          </div>
        </div>
      </section>
      <RightPanel onPickFile={() => fileRef.current?.click()} />
      <MobilePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onPickFile={() => {
          setPanelOpen(false);
          fileRef.current?.click();
        }}
      />
    </>
  );
}
