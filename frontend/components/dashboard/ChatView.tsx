"use client";

import { useEffect, useRef, useState } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { AGENTS, DOCS, EVENTS, QUIZ, SUGGESTIONS, TODAY } from "@/lib/dashboard-data";
import { cn } from "@/lib/cn";

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "agent"; agent: string; text: string }
  | { id: number; role: "plan" };

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function AgentTag({ agent, tone = "mint" }: { agent: string; tone?: "mint" | "sky" | "yellow" }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 text-xs">
      <span className="grid h-7 w-7 place-items-center border-2 border-brand-black bg-brand-yellow font-pixel">:)</span>
      <b className="font-pixel">Campus AI</b>
      <PixelBadge tone={tone}>{agent} agent</PixelBadge>
    </div>
  );
}

function QuizCard() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = QUIZ[i];

  function pick(k: number) {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.correct) setScore((s) => s + 1);
  }
  function retry() {
    if (picked === q.correct) setScore((s) => s - 1);
    setPicked(null);
  }
  function next() {
    if (i < QUIZ.length - 1) {
      setI(i + 1);
      setPicked(null);
    } else setDone(true);
  }
  function restart() {
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return (
      <PixelCard className="p-6 text-center">
        <p className="font-pixel text-4xl font-bold">
          {score} / {QUIZ.length}
        </p>
        <p className="mt-2 text-sm">{score === QUIZ.length ? "Perfect run." : "Review slide 12 and try again."}</p>
        <PixelButton size="sm" className="mt-4" onClick={restart}>
          Restart quiz
        </PixelButton>
      </PixelCard>
    );
  }

  return (
    <PixelCard className="p-0">
      <div className="flex justify-between border-b-pixel border-brand-black bg-brand-yellow-soft px-4 py-2 font-pixel text-xs font-semibold">
        <span>WEEK 4 · CELL RESPIRATION</span>
        <span>
          Question {i + 1} of {QUIZ.length}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-pixel text-lg font-bold">{q.q}</h3>
        <div className="mt-3 flex flex-col gap-2">
          {q.options.map((o, k) => (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(k)}
              className={cn(
                "pixel-focus flex items-center gap-3 border-2 border-brand-black px-2.5 py-2 text-left text-sm",
                picked === null && "bg-brand-white hover:translate-x-[3px]",
                picked !== null && k === q.correct && "bg-accent-mint shadow-pixel-sm",
                picked === k && k !== q.correct && "bg-accent-coral",
                picked !== null && k !== q.correct && picked !== k && "bg-brand-white",
              )}
            >
              <b className="grid h-6 w-6 shrink-0 place-items-center bg-brand-black font-pixel text-brand-white">{"ABCD"[k]}</b>
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className={cn("mt-3 border-2 border-brand-black p-3 text-sm", picked === q.correct ? "bg-accent-mint" : "bg-accent-coral")}>
            <b>{picked === q.correct ? "Correct." : "Not quite."}</b> {q.explain}
          </div>
        )}
      </div>
      <div className="flex justify-between gap-2 border-t-pixel border-brand-black px-4 py-3">
        <PixelButton size="sm" variant="secondary" onClick={retry} disabled={picked === null}>
          Try again
        </PixelButton>
        <PixelButton size="sm" variant="dark" onClick={next} disabled={picked === null}>
          {i < QUIZ.length - 1 ? "Next question" : "See score"}
        </PixelButton>
      </div>
    </PixelCard>
  );
}

function RightPanel({ planned }: { planned: boolean }) {
  const [tab, setTab] = useState<"Sources" | "Plan" | "Notes">("Sources");
  const weekStart = new Date(TODAY);
  weekStart.setDate(TODAY.getDate() + 1); // Mon 12 Oct

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l-pixel border-brand-black bg-brand-yellow-soft p-4 lg:flex">
      <div className="grid grid-cols-3 border-pixel border-brand-black">
        {(["Sources", "Plan", "Notes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("py-2 font-pixel text-sm font-semibold", tab === t ? "bg-brand-black text-brand-white" : "bg-brand-white")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Sources" && (
        <>
          <p className="font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Used in this chat</p>
          <PixelCard className="p-3 text-sm">
            <b>Bio101_Lecture6.pdf</b>
            <p className="text-xs text-muted-onPaper">Slide 12 matched</p>
            <PixelBadge tone="mint" className="mt-2">Ready</PixelBadge>
          </PixelCard>
          <p className="font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Your documents</p>
          {DOCS.slice(1).map((d) => (
            <div key={d.name} className="border-2 border-brand-black bg-brand-white p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{d.name}</span>
                <PixelBadge tone={d.status === "Ready" ? "mint" : "sky"}>{d.status}</PixelBadge>
              </div>
              {d.status === "Reading" && (
                <div className="mt-2 h-3.5 border-2 border-brand-black bg-brand-white">
                  <div className="h-full w-1/2 bg-[repeating-linear-gradient(-45deg,#171717_0_6px,#FACC15_6px_12px)]" />
                </div>
              )}
            </div>
          ))}
          <div className="border-2 border-dashed border-brand-black p-4 text-center text-xs text-muted-onPaper">
            Drop a PDF here
            <br />
            or browse your files
          </div>
        </>
      )}

      {tab === "Plan" && (
        <>
          <p className="font-pixel text-xs uppercase tracking-wide text-muted-onPaper">Next 7 days</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {WEEK.map((d, k) => {
              const day = new Date(weekStart);
              day.setDate(weekStart.getDate() + k);
              return (
                <div key={d}>
                  {d}
                  <span className={cn("block border-2 border-brand-black py-1 text-sm", day.getDate() === 15 ? "bg-brand-yellow" : "bg-brand-white")}>
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
          {EVENTS.filter((e) => e.title !== "Bio101 quiz" || planned).map((e) => (
            <div key={e.title} className="flex items-center justify-between border-2 border-brand-black bg-brand-white px-2 py-1.5 text-xs">
              <span>{e.title}</span>
              <small>{e.date.slice(8)} Oct</small>
            </div>
          ))}
        </>
      )}

      {tab === "Notes" && (
        <p className="text-sm text-muted-onPaper">
          Glycolysis: cytosol, no O₂ needed, net 2 ATP, ends in pyruvate. Pick up from slide 12.
        </p>
      )}
    </aside>
  );
}

export function ChatView() {
  const [agent, setAgent] = useState<(typeof AGENTS)[number]>("Quiz");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [planned, setPlanned] = useState(false);
  const [text, setText] = useState("");
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && msgs.length) el.scrollTo({ top: el.scrollHeight });
  }, [msgs.length]);

  function say(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setText("");
    const label = agent === "Auto" ? "Quiz" : agent;
    setMsgs((m) => [
      ...m,
      { id: idRef.current++, role: "user", text: value },
      // TODO: replace with a call to the backend chat endpoint (streaming).
      { id: idRef.current++, role: "agent", agent: label, text: "Demo reply. This chat is not connected to the backend yet." },
    ]);
  }

  function addPlan() {
    setPlanned(true);
    setMsgs((m) => [...m, { id: idRef.current++, role: "plan" }]);
  }
  function undoPlan() {
    setPlanned(false);
    setMsgs((m) => m.filter((x) => x.role !== "plan"));
  }

  return (
    <>
      <section className="bg-graph flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b-pixel border-brand-black bg-brand-white px-5 py-3">
          <div>
            <h1 className="font-pixel text-xl font-bold">Quiz me on week 4</h1>
            <p className="text-xs text-muted-onPaper">Routed to {agent === "Auto" ? "Quiz" : agent} agent · 1 source</p>
          </div>
          <PixelBadge tone="coral">Quiz in 4 days</PixelBadge>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b-pixel border-brand-black bg-brand-yellow-soft px-5 py-3">
          <span className="font-pixel text-sm">Agent</span>
          {AGENTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAgent(a)}
              className={cn(
                "pixel-focus border-2 border-brand-black px-3 py-1 font-pixel text-xs font-semibold",
                agent === a ? "bg-accent-mint shadow-pixel-sm" : "bg-brand-white",
              )}
            >
              {a}
            </button>
          ))}
        </div>

        {/* One scroll area: messages and the composer live together */}
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-4 px-5 pb-2 pt-5">
            <div className="max-w-[80%] self-end bg-brand-black px-3.5 py-2 text-sm text-brand-white">Quiz me on week 4.</div>

            <div className="max-w-xl">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="grid h-7 w-7 place-items-center border-2 border-brand-black bg-brand-yellow font-pixel">:)</span>
                <b className="font-pixel">Campus AI</b>
                <PixelBadge tone="mint">Quiz agent</PixelBadge>
                <span className="text-muted-onPaper">Read Bio101_Lecture6.pdf · 14 passages matched</span>
              </div>
              <QuizCard />
              <div className="mt-3 flex flex-wrap gap-2">
                <PixelButton size="sm" variant="secondary" onClick={() => say("Make flashcards from this quiz.")}>Make flashcards</PixelButton>
                <PixelButton size="sm" variant="secondary" onClick={() => say("Explain it simpler.")}>Explain it simpler</PixelButton>
                <PixelButton size="sm" onClick={addPlan} disabled={planned}>Add to plan</PixelButton>
              </div>
            </div>

            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="max-w-[80%] self-end bg-brand-black px-3.5 py-2 text-sm text-brand-white">{m.text}</div>
              ) : m.role === "agent" ? (
                <div key={m.id} className="max-w-xl">
                  <AgentTag agent={m.agent} tone="yellow" />
                  <PixelCard className="px-4 py-3 text-sm">{m.text}</PixelCard>
                </div>
              ) : (
                <div key={m.id} className="max-w-md">
                  <AgentTag agent="Planner" tone="sky" />
                  <PixelCard className="flex p-0">
                    <div className="border-r-pixel border-brand-black bg-accent-sky px-5 py-3 text-center font-pixel text-3xl font-bold leading-none">
                      <small className="block font-sans text-xs font-semibold">OCT</small>15
                    </div>
                    <div className="flex-1 p-3">
                      <p className="text-xs font-semibold text-muted-onPaper">ADDED TO YOUR PLAN</p>
                      <p className="font-pixel text-lg font-bold">Bio101 quiz</p>
                      <p className="text-xs text-muted-onPaper">Thursday · reminder 48 hours before</p>
                      <div className="mt-2 flex gap-2">
                        <PixelButton size="sm" variant="dark" href="/dashboard/calendar">View in calendar</PixelButton>
                        <PixelButton size="sm" variant="secondary" onClick={undoPlan}>Undo</PixelButton>
                      </div>
                    </div>
                  </PixelCard>
                </div>
              ),
            )}
          </div>

          <div className="sticky bottom-0 bg-gradient-to-b from-transparent to-brand-white px-5 pb-4 pt-4">
            <div className="mb-2.5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <PixelButton key={s} size="sm" variant="secondary" onClick={() => say(s)}>{s}</PixelButton>
              ))}
            </div>
            <form
              className="flex items-center gap-2 border-pixel border-brand-black bg-brand-white p-2 shadow-pixel"
              onSubmit={(e) => {
                e.preventDefault();
                say(text);
              }}
            >
              <PixelButton size="sm" variant="secondary" aria-label="Attach file">
                <Icon d="M21 12.5l-8.5 8.5a5.5 5.5 0 01-8-8l9-9a3.5 3.5 0 015 5l-9 9a1.5 1.5 0 01-2-2l8-8" />
              </PixelButton>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask anything about your notes…"
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <PixelButton size="sm" variant="secondary" aria-label="Voice input">
                <Icon d="M9 3h6v12H9zM5 11a7 7 0 0014 0M12 18v3" />
              </PixelButton>
              <PixelButton size="sm" type="submit" aria-label="Send">→</PixelButton>
            </form>
          </div>
        </div>
      </section>
      <RightPanel planned={planned} />
    </>
  );
}
