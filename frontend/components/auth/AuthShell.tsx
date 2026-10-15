import Image from "next/image";
import type { ReactNode } from "react";

import { PixelBadge } from "@/components/pixel";
import { Logo } from "@/components/ui/Logo";
import { ChatLoop } from "./ChatLoop";

type Panel = "chat" | "photo" | "objects";

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
const SIDE: Record<Panel, { badge: string; headline: string; blurb: string; stats: [string, string][] }> = {
  chat: {
    badge: "Welcome back",
    headline: "Pick up right where you left off.",
    blurb: "Your notes, chats and deadlines are exactly as you left them.",
    stats: [["8", "study agents"], ["1", "place for all notes"], ["24/7", "ready to help"]],
  },
  photo: {
    badge: "Join Campus AI",
    headline: "Study smarter, starting today.",
    blurb: "Free to join. Upload your notes and get answers, quizzes and a plan built from your own material.",
    stats: [["PDF", "DOCX, TXT, MD"], ["Quiz", "and flashcards"], ["Plan", "with reminders"]],
  },
  objects: {
    badge: "Account help",
    headline: "Locked out? It happens to everyone.",
    blurb: "Reset your password in a minute and get back to studying.",
    stats: [["1 min", "to reset"], ["Email", "link, no support ticket"], ["Safe", "one-time links"]],
  },
};

/**
 * Split-screen frame shared by every auth page: a full yellow showcase panel
 * on the left (brand, headline, visuals, key facts) and the form on the right.
 * Below `lg` the panel is dropped and the form takes the whole screen.
 */
export function AuthShell({ panel, eyebrow, title, subtitle, children }: AuthShellProps) {
  const side = SIDE[panel];
  return (
    <main className="min-h-screen bg-brand-white text-brand-black lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden min-h-screen flex-col overflow-hidden border-r-pixel border-brand-black bg-brand-yellow px-12 py-8 lg:flex xl:px-16">
        <div className="flex items-center justify-between">
          <Logo height={32} />
          <a href="/" className="font-pixel text-sm font-bold uppercase tracking-wide underline-offset-4 hover:underline">
            &larr; Back to home
          </a>
        </div>

        <div className="mt-10 border-t-pixel border-brand-black pt-8">
          <PixelBadge tone="black">{side.badge}</PixelBadge>
          <h2 className="mt-5 max-w-[520px] font-pixel text-5xl font-bold leading-[1.05] xl:text-6xl">{side.headline}</h2>
          <p className="mt-5 max-w-[460px] font-sans text-lg leading-relaxed">{side.blurb}</p>
        </div>

        <div aria-hidden="true" className="relative my-auto flex items-center justify-center py-8">
          {panel === "chat" && <ChatPanel />}
          {panel === "photo" && <PhotoPanel />}
          {panel === "objects" && <ObjectsPanel />}
        </div>

        <dl className="grid grid-cols-3 gap-4 border-t-pixel border-brand-black pt-5">
          {side.stats.map(([big, small]) => (
            <div key={big}>
              <dt className="font-pixel text-2xl font-bold leading-none">{big}</dt>
              <dd className="mt-1 font-sans text-sm leading-snug">{small}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-14 xl:px-24">
        <div className="lg:hidden">
          <Logo height={32} />
        </div>
        <div className="my-auto w-full max-w-md py-10">
          <PixelBadge tone="black">{eyebrow}</PixelBadge>
          <h1 className="mt-4 font-pixel text-4xl font-bold leading-[1.1]">{title}</h1>
          {subtitle && <p className="mt-3 font-sans text-base leading-relaxed text-muted-onPaper">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </main>
  );
}

const OBJ = "[filter:drop-shadow(3px_3px_0_#171717)]";

function ChatPanel() {
  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="relative w-full max-w-[500px]">
        <ChatLoop />
        <div className="absolute -right-6 -top-24 w-20 rotate-3 animate-pixel-float">
          <Image
            src="/assets/hero/obj-cap-c.webp"
            width={207}
            height={368}
            alt=""
            sizes="100px"
            className={`h-auto w-full ${OBJ}`}
          />
        </div>
        <PixelBadge tone="mint" className="absolute -bottom-5 right-4 rotate-[4deg] shadow-pixel-sm">
          Reads your PDFs
        </PixelBadge>
        <PixelBadge tone="coral" className="absolute -bottom-7 left-2 -rotate-[4deg] shadow-pixel-sm">
          Exam in 3 days
        </PixelBadge>
      </div>
    </div>
  );
}

const STEPS = [
  { n: "1", title: "Upload your notes", text: "PDF, DOCX, TXT or Markdown." },
  { n: "2", title: "Ask anything", text: "Quizzes, flashcards, summaries, homework help." },
  { n: "3", title: "Stay on schedule", text: "Deadlines become a plan with reminders." },
];

function PhotoPanel() {
  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="relative w-full max-w-[440px]">
        <div className="rotate-[1.5deg] border-pixel border-brand-black bg-brand-white shadow-pixel-lg">
          <div className="flex items-center gap-2.5 border-b-pixel border-brand-black bg-brand-yellow px-3 py-1.5">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 border-2 border-brand-black bg-brand-white" />
              <span className="h-3 w-3 border-2 border-brand-black bg-brand-white" />
              <span className="h-3 w-3 border-2 border-brand-black bg-brand-black" />
            </div>
            <span className="font-pixel text-xs font-semibold leading-none">first_day</span>
          </div>
          <ol className="flex flex-col gap-4 p-5">
            {STEPS.map((st) => (
              <li key={st.n} className="flex items-start gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center border-pixel border-brand-black bg-brand-yellow font-pixel text-base font-bold">
                  {st.n}
                </span>
                <div>
                  <p className="font-pixel text-base font-bold leading-tight">{st.title}</p>
                  <p className="mt-0.5 font-sans text-sm leading-snug text-muted-onPaper">{st.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="absolute -left-10 -top-[88px] w-32 -rotate-6 animate-pixel-float">
          <Image src="/assets/hero/obj-flashcards.webp" width={309} height={241} alt="" sizes="130px" className={`h-auto w-full ${OBJ}`} />
        </div>
        <div className="absolute -bottom-10 -right-8 w-36 -rotate-3">
          <Image src="/assets/hero/obj-calendar.webp" width={317} height={238} alt="" sizes="150px" className={`h-auto w-full ${OBJ}`} />
        </div>
      </div>
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
    <div className="flex w-full flex-col items-center justify-center">
      <div className="grid w-full max-w-[460px] grid-cols-2 items-center justify-items-center gap-x-6 gap-y-8">
        {items.map((it, i) => (
          <div key={it.src} className={`${it.cls} animate-pixel-float`} style={{ animationDelay: `${i * 0.4}s` }}>
            <Image src={it.src} width={it.w} height={it.h} alt="" sizes="180px" className={`h-auto w-full ${OBJ}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
