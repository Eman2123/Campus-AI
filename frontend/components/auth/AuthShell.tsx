import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PixelBadge } from "@/components/pixel";
import { Logo } from "@/components/ui/Logo";
import { ChatLoop } from "./ChatLoop";

type Panel = "chat" | "steps" | "objects";

type AuthShellProps = {
  /** What fills the yellow side panel (desktop only). */
  panel: Panel;
  /** Short label above the title, e.g. "Welcome back". */
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Split-screen frame shared by every auth page: the form on the left, a
 * yellow showcase panel on the right. Below `lg` the panel is dropped and
 * the form takes the whole screen.
 */
export function AuthShell({ panel, eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-brand-white text-brand-black lg:grid lg:grid-cols-2">
      <section className="bg-graph flex min-h-screen flex-col px-5 py-6 sm:px-12 lg:px-14 xl:px-20">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
          <Logo height={32} />
          <Link href="/" className="pixel-focus font-pixel text-sm font-semibold hover:underline">
            ← Back to home
          </Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-8">
          <PixelBadge tone="black">{eyebrow}</PixelBadge>
          <h1 className="mt-4 font-pixel text-4xl font-bold leading-[1.1]">{title}</h1>
          {subtitle && <p className="mt-3 font-sans text-base leading-relaxed text-muted-onPaper">{subtitle}</p>}
          <div className="mt-6 border-pixel border-brand-black bg-brand-white p-5 shadow-pixel sm:p-6">{children}</div>
        </div>
        <p className="mx-auto w-full max-w-md font-sans text-xs text-muted-onPaper">
          By continuing you agree to the{" "}
          <Link href="/terms" className="font-semibold underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold underline">
            Privacy policy
          </Link>
          .
        </p>
      </section>

      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden border-l-pixel border-brand-black bg-brand-black text-brand-white lg:block"
      >
        <PanelBackdrop />
        <div className="relative h-full">
          {panel === "chat" && <ChatPanel />}
          {panel === "steps" && <StepsPanel />}
          {panel === "objects" && <ObjectsPanel />}
        </div>
      </aside>
    </main>
  );
}

const OBJ = "[filter:drop-shadow(3px_3px_0_#FACC15)]";

/** Dark pixel-grid backdrop with a few yellow blocks, drawn in CSS so it costs no bandwidth. */
function PanelBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250,204,21,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.09) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute left-10 top-12 h-6 w-6 bg-brand-yellow animate-pixel-float" />
      <div className="absolute right-14 top-24 h-4 w-4 bg-accent-coral animate-pixel-float" style={{ animationDelay: "0.6s" }} />
      <div className="absolute bottom-16 left-16 h-4 w-4 bg-accent-mint animate-pixel-float" style={{ animationDelay: "1.1s" }} />
      <div className="absolute bottom-24 right-10 h-8 w-8 bg-brand-yellow animate-pixel-float" style={{ animationDelay: "0.3s" }} />
    </>
  );
}

function ChatPanel() {
  return (
    <div className="flex h-full min-h-[640px] flex-col items-center justify-center gap-12 p-10 xl:p-16">
      <div className="relative w-full max-w-[500px]">
        <ChatLoop />
        <PixelBadge tone="mint" className="absolute -bottom-5 right-4 rotate-[4deg] shadow-pixel-sm">
          Reads your PDFs
        </PixelBadge>
        <PixelBadge tone="coral" className="absolute -bottom-7 left-2 -rotate-[4deg] shadow-pixel-sm">
          Exam in 3 days
        </PixelBadge>
      </div>
      <div className="w-full max-w-[500px]">
        <p className="font-pixel text-3xl font-bold leading-tight text-brand-yellow">Pick up where you left off.</p>
        <p className="mt-2 font-sans text-sm text-brand-white/70">Your chats, notes and study plan are waiting.</p>
      </div>
    </div>
  );
}

const STEPS = [
  { n: "1", title: "Upload your notes", text: "PDF, DOCX, TXT or Markdown. They are read and indexed for you.", tone: "bg-brand-yellow" },
  { n: "2", title: "Ask anything", text: "Quizzes, flashcards, summaries or homework help. The right agent is picked for you.", tone: "bg-brand-white" },
  { n: "3", title: "Stay on schedule", text: "Deadlines become a plan, with a calendar export and reminder emails.", tone: "bg-brand-yellow" },
];

const FACTS = ["8 study agents", "Voice in and out", "Delete your data any time"];

function StepsPanel() {
  return (
    <div className="flex h-full min-h-[640px] flex-col items-center justify-center gap-9 p-10 xl:p-16">
      <div className="w-full max-w-[460px]">
        <p className="font-pixel text-3xl font-bold leading-tight text-brand-yellow">Ready in three steps.</p>
        <p className="mt-2 font-sans text-sm text-brand-white/70">Free while you&rsquo;re a student. Takes under a minute.</p>
      </div>
      <ol className="flex w-full max-w-[460px] flex-col gap-4">
        {STEPS.map((st, i) => (
          <li
            key={st.n}
            className={`flex items-start gap-4 border-pixel border-brand-black p-4 text-brand-black shadow-[4px_4px_0_#FACC15] ${st.tone} ${i % 2 ? "ml-6" : "mr-6"}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center border-pixel border-brand-black bg-brand-black font-pixel text-lg font-bold text-brand-yellow">
              {st.n}
            </span>
            <div>
              <p className="font-pixel text-lg font-bold leading-tight">{st.title}</p>
              <p className="mt-1 font-sans text-sm leading-snug">{st.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <ul className="flex w-full max-w-[460px] flex-wrap gap-2">
        {FACTS.map((f) => (
          <li key={f} className="border-2 border-brand-yellow px-3 py-1 font-pixel text-xs font-semibold text-brand-yellow">
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ObjectsPanel() {
  const items = [
    { src: "/assets/hero/obj-pdf.webp", w: 272, h: 240, cls: "w-40 rotate-[-5deg]" },
    { src: "/assets/hero/obj-flashcards.webp", w: 309, h: 241, cls: "w-44 rotate-[4deg]" },
    { src: "/assets/hero/obj-calendar.webp", w: 317, h: 238, cls: "w-44 rotate-[3deg]" },
    { src: "/assets/hero/obj-mic.webp", w: 206, h: 225, cls: "w-28 rotate-[-4deg]" },
  ];
  return (
    <div className="flex h-full min-h-[640px] flex-col items-center justify-center gap-10 p-10 xl:p-16">
      <div className="grid w-full max-w-[460px] grid-cols-2 items-center justify-items-center gap-x-6 gap-y-8">
        {items.map((it, i) => (
          <div key={it.src} className={`${it.cls} animate-pixel-float`} style={{ animationDelay: `${i * 0.4}s` }}>
            <Image src={it.src} width={it.w} height={it.h} alt="" sizes="180px" className={`h-auto w-full ${OBJ}`} />
          </div>
        ))}
      </div>
      <p className="w-full max-w-[460px] font-pixel text-2xl font-bold leading-snug text-brand-yellow">
        Locked out? It happens to everyone.
      </p>
    </div>
  );
}
