import Image from "next/image";
import { PixelBadge, PixelButton, PixelSection } from "@/components/pixel";
import { HeroArt } from "./HeroArt";

// Product facts, not user counts. Swap for real numbers once there are any.
const FACTS = ["6 specialist agents", "Type or talk", "Your notes first"];

// The four things the product does, as numbered tiles under the hero.
// Class names are written out in full so Tailwind can see them.
const TILES = [
  {
    n: "01",
    badge: "bg-brand-yellow",
    rot: "lg:-rotate-[1.5deg]",
    src: "/assets/hero/obj-pdf.webp",
    w: 272,
    h: 240,
    imgW: "w-[130px]",
    title: "Upload your notes",
    text: "Syllabus, problem sets, slides and lecture notes.",
  },
  {
    n: "02",
    badge: "bg-accent-mint",
    rot: "lg:rotate-1",
    src: "/assets/hero/obj-flashcards.webp",
    w: 309,
    h: 241,
    imgW: "w-[150px]",
    title: "Practice what sticks",
    text: "Quizzes and flashcards made from your material.",
  },
  {
    n: "03",
    badge: "bg-accent-coral",
    rot: "lg:-rotate-1",
    src: "/assets/hero/obj-calendar.webp",
    w: 317,
    h: 238,
    imgW: "w-[150px]",
    title: "Plan backwards",
    text: "A study plan that works back from your deadlines.",
  },
  {
    n: "04",
    badge: "bg-accent-sky",
    rot: "lg:rotate-[1.5deg]",
    src: "/assets/hero/obj-mic.webp",
    w: 206,
    h: 225,
    imgW: "w-[100px]",
    title: "Just ask out loud",
    text: "Voice or text, whichever suits the moment.",
  },
] as const;

/** Section 2: yellow hero. Calm photo layout on top, four numbered tiles underneath. */
export function Hero() {
  return (
    <PixelSection bg="yellow" className="overflow-x-clip !pt-10 sm:!pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
        <div>
          <PixelBadge tone="black" className="mb-5">Your AI study buddy</PixelBadge>
          <h1 className="font-pixel text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
            Study help that actually{" "}
            <span className="inline-block -rotate-1 bg-brand-black px-2 text-brand-yellow">
              reads
            </span>{" "}
            your coursework.
          </h1>
          <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed">
            Upload a syllabus, a problem set, a stack of lecture notes. Ask out loud or type it in
            your own words. Campus AI answers from your own material, not a guess.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <PixelButton href="/signup" variant="dark" size="lg">
              Start studying
            </PixelButton>
            <PixelButton href="#how-it-works" variant="secondary" size="lg">
              See how it works
            </PixelButton>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-2 font-pixel text-sm font-semibold">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 bg-brand-black" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <HeroArt />
      </div>

      <ol className="mt-16 grid gap-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {TILES.map((t) => (
          <li key={t.n} className={t.rot}>
            <div className="relative flex h-40 items-center justify-center border-pixel border-brand-black bg-brand-white shadow-pixel-lg">
              <span
                className={`absolute -left-[3px] -top-[3px] border-pixel border-brand-black px-2 py-0.5 font-pixel text-sm font-bold ${t.badge}`}
              >
                {t.n}
              </span>
              <Image
                src={t.src}
                width={t.w}
                height={t.h}
                alt=""
                aria-hidden="true"
                sizes="150px"
                className={`h-auto ${t.imgW} [filter:drop-shadow(3px_3px_0_#171717)]`}
              />
            </div>
            <h3 className="mt-4 font-pixel text-lg font-bold">{t.title}</h3>
            <p className="mt-1 font-sans text-sm leading-snug">{t.text}</p>
          </li>
        ))}
      </ol>
    </PixelSection>
  );
}
