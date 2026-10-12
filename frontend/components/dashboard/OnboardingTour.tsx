"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { cn } from "@/lib/cn";
import { useDarkMode } from "@/lib/theme";

import { useDashboard } from "./DashboardContext";

const OPEN_EVENT = "campus-ai:open-tour";
const seenKey = (userId: string) => `campus-ai:tour-seen:${userId}`;

/** Lets any page (e.g. Settings) reopen the tour. */
export function openTour(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Slide = { tag: string; title: string; body: string; visual: ReactNode };

function Bubble({ me, children }: { me?: boolean; children: ReactNode }) {
  return (
    <div className={cn("max-w-[85%] border-2 border-brand-black px-3 py-2 text-sm", me ? "self-end bg-brand-black text-brand-white" : "bg-brand-white")}>
      {children}
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    tag: "Welcome",
    title: "Study help that reads your coursework",
    body: "Campus AI answers from your own notes, builds quizzes and flashcards, and plans your study time. This quick tour shows what each part does.",
    visual: (
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-16 w-16 place-items-center border-pixel border-brand-black bg-brand-yellow font-pixel text-3xl font-bold shadow-pixel">C</span>
        <div className="flex flex-wrap justify-center gap-2">
          {["Chat", "Documents", "Planner", "Calendar"].map((t) => <PixelBadge key={t} tone="white">{t}</PixelBadge>)}
        </div>
      </div>
    ),
  },
  {
    tag: "Documents",
    title: "Upload your notes and slides",
    body: "Add PDFs from the paperclip in the chat or the Documents panel. Campus AI reads them in the background; when the badge turns Ready, you can ask questions about them. You can delete a document any time.",
    visual: (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 border-2 border-brand-black bg-brand-white px-3 py-2 text-sm">
          <span className="truncate">Bio101_Lecture6.pdf</span><PixelBadge tone="sky">Reading</PixelBadge>
        </div>
        <div className="flex items-center justify-between gap-3 border-2 border-brand-black bg-brand-white px-3 py-2 text-sm">
          <span className="truncate">Econ_Notes_Wk3.pdf</span><PixelBadge tone="mint">Ready</PixelBadge>
        </div>
      </div>
    ),
  },
  {
    tag: "Chat",
    title: "Ask in plain English",
    body: "Type a question and the right helper is picked for you. Answers come from your uploaded material, and every chat is saved in the sidebar so you can come back to it.",
    visual: (
      <div className="flex flex-col gap-2">
        <Bubble me>What did Lecture 6 say about glycolysis?</Bubble>
        <Bubble>Glycolysis happens in the cytosol and nets 2 ATP per glucose.</Bubble>
      </div>
    ),
  },
  {
    tag: "Quizzes and flashcards",
    title: "Test yourself",
    body: "Say \"Quiz me on week 4\" or \"Make flashcards from slide 12\". You can also use the Quiz and Flashcards starters above the message box.",
    visual: (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-pixel font-bold">Where does glycolysis take place?</p>
        <div className="border-2 border-brand-black bg-brand-white px-3 py-1.5">A. Mitochondrial matrix</div>
        <div className="border-2 border-brand-black bg-accent-mint px-3 py-1.5 text-brand-black">B. Cytosol</div>
      </div>
    ),
  },
  {
    tag: "Notes, homework, research",
    title: "Summaries and step-by-step help",
    body: "Ask for a summary of a lecture, a worked solution to a homework problem, or an explanation of a topic. Each one has its own starter, so you never face a blank box.",
    visual: (
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {["Notes", "Homework", "Research"].map((t) => (
          <div key={t} className="border-2 border-brand-black bg-brand-white px-2 py-3 font-pixel font-bold">{t}</div>
        ))}
      </div>
    ),
  },
  {
    tag: "Planner and calendar",
    title: "A study plan that works backwards",
    body: "Tell the planner your deadlines and it schedules study sessions before them. See everything on the Calendar (month, week or list) and export it to Google Calendar, Apple Calendar or Outlook as a .ics file.",
    visual: (
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between border-2 border-brand-black bg-brand-white px-3 py-2"><span>Bio101 review</span><PixelBadge tone="mint">study</PixelBadge></div>
        <div className="flex items-center justify-between border-2 border-brand-black bg-brand-white px-3 py-2"><span>Econ essay draft</span><PixelBadge tone="coral">deadline</PixelBadge></div>
      </div>
    ),
  },
  {
    tag: "Voice",
    title: "Prefer talking? Use the mic",
    body: "Press the microphone, speak your question, and press it again to send. Your words are written out in the chat, and the answer appears below them.",
    visual: (
      <div className="flex items-center justify-center gap-4">
        <span className="grid h-14 w-14 place-items-center border-pixel border-brand-black bg-brand-yellow shadow-pixel">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 3h6v12H9zM5 11a7 7 0 0014 0M12 18v3" /></svg>
        </span>
        <span className="font-pixel text-sm font-bold">Recording…</span>
      </div>
    ),
  },
  {
    tag: "Reminders",
    title: "Never miss a deadline",
    body: "Get a reminder email before something is due and an optional morning digest of what is coming up. Turn them on or off, or send one right now, from Settings.",
    visual: (
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between border-2 border-brand-black bg-brand-white px-3 py-2"><span>Deadline reminders</span><PixelBadge tone="sky">email</PixelBadge></div>
        <div className="flex items-center justify-between border-2 border-brand-black bg-brand-white px-3 py-2"><span>Daily digest</span><PixelBadge tone="sky">email</PixelBadge></div>
      </div>
    ),
  },
  {
    tag: "You are in control",
    title: "Your data, your settings",
    body: "In Settings you can switch between light and dark, change your name, clear your chat history, delete documents, or delete your account. You can reopen this tour from there at any time.",
    visual: (
      <div className="flex flex-col gap-2 text-sm">
        {["Theme", "Chat history", "Documents", "Account"].map((t) => (
          <div key={t} className="border-2 border-brand-black bg-brand-white px-3 py-1.5">{t}</div>
        ))}
      </div>
    ),
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const dark = useDarkMode();
  const { user } = useDashboard();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  // First visit: show once per user on this browser.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(seenKey(user.id))) setOpen(true);
    } catch {
      // storage blocked: skip the automatic tour
    }
  }, [user.id]);

  useEffect(() => {
    const onOpen = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(seenKey(user.id), "1");
    } catch {
      // ignore
    }
  }, [user.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className={cn("fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4", dark && "app-dark")}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Campus AI tour" className="w-full max-w-lg text-brand-black outline-none">
        <PixelCard className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-3">
            <PixelBadge tone="yellow">{slide.tag}</PixelBadge>
            <span className="font-pixel text-xs text-muted-onPaper">{i + 1} / {SLIDES.length}</span>
          </div>

          <div className="border-2 border-brand-black bg-brand-yellow-soft p-4">{slide.visual}</div>

          <div>
            <h2 className="font-pixel text-2xl font-bold leading-tight">{slide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed">{slide.body}</p>
          </div>

          <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Tour steps">
            {SLIDES.map((s, k) => (
              <button
                key={s.tag}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={`Go to step ${k + 1}: ${s.tag}`}
                onClick={() => setI(k)}
                className={cn("h-3 border-2 border-brand-black", k === i ? "w-6 bg-brand-yellow" : "w-3 bg-brand-white")}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={close} className="text-sm underline">{last ? "Close" : "Skip tour"}</button>
            <div className="flex gap-2">
              <PixelButton size="sm" variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>Back</PixelButton>
              {last ? (
                <PixelButton
                  size="sm"
                  onClick={() => {
                    close();
                    router.push("/dashboard/chat");
                  }}
                >
                  Start chatting
                </PixelButton>
              ) : (
                <PixelButton size="sm" onClick={() => setI(i + 1)}>Next</PixelButton>
              )}
            </div>
          </div>
        </PixelCard>
      </div>
    </div>
  );
}
