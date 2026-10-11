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
export function AuthShell({ panel, eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-brand-white text-brand-black lg:grid lg:grid-cols-2">
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
        <Logo height={32} />
        <div className="my-auto w-full max-w-md py-10">
          <PixelBadge tone="black">{eyebrow}</PixelBadge>
          <h1 className="mt-4 font-pixel text-4xl font-bold leading-[1.1]">{title}</h1>
          {subtitle && <p className="mt-3 font-sans text-base leading-relaxed text-muted-onPaper">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </section>

      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden border-l-pixel border-brand-black bg-brand-yellow lg:block"
      >
        {panel === "chat" && <ChatPanel />}
        {panel === "photo" && <PhotoPanel />}
        {panel === "objects" && <ObjectsPanel />}
      </aside>
    </main>
  );
}

const OBJ = "[filter:drop-shadow(3px_3px_0_#171717)]";

function ChatPanel() {
  return (
    <div className="flex h-full min-h-[640px] flex-col items-center justify-center gap-14 p-10 xl:p-16">
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
      <p className="w-full max-w-[500px] font-pixel text-xl font-semibold leading-snug">
        Pick up where you left off.
      </p>
    </div>
  );
}

const BENEFITS = [
  "Answers from your own notes",
  "Quizzes and flashcards",
  "A plan built from your deadlines",
];

function PhotoPanel() {
  return (
    <div className="flex h-full min-h-[640px] flex-col items-center justify-center gap-12 p-10 xl:p-16">
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
          <Image
            src="/assets/auth/photo-campus.webp"
            width={640}
            height={640}
            alt=""
            sizes="440px"
            className="block h-auto w-full"
          />
        </div>
        <div className="absolute -left-10 -top-[88px] w-32 -rotate-6 animate-pixel-float">
          <Image
            src="/assets/hero/obj-flashcards.webp"
            width={309}
            height={241}
            alt=""
            sizes="130px"
            className={`h-auto w-full ${OBJ}`}
          />
        </div>
        <div className="absolute -bottom-10 -right-8 w-36 -rotate-3">
          <Image
            src="/assets/hero/obj-calendar.webp"
            width={317}
            height={238}
            alt=""
            sizes="150px"
            className={`h-auto w-full ${OBJ}`}
          />
        </div>
      </div>
      <ul className="flex w-full max-w-[440px] flex-col gap-2.5 font-pixel text-lg font-semibold">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 bg-brand-black" />
            {b}
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
      <p className="w-full max-w-[460px] font-pixel text-xl font-semibold leading-snug">
        Locked out? It happens to everyone.
      </p>
    </div>
  );
}
