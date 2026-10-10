import Image from "next/image";
import { PixelBadge, PixelButton, PixelSection } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";

const AGENT_TAGS = ["Research", "Homework", "Quizzes", "Notes", "Flashcards", "Feedback"];

/** Section 2: yellow hero. Robot floats in a graph-paper panel so its amber never blends into the yellow. */
export function Hero() {
  const robot = ASSETS.hero.robot;

  return (
    <PixelSection bg="yellow" className="!pt-10 sm:!pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <PixelBadge tone="black" className="mb-5">Your AI study buddy</PixelBadge>
          <h1 className="font-pixel text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Study help that actually reads your coursework.
          </h1>
          <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed">
            Upload a syllabus, a problem set, a stack of lecture notes. Ask out loud or type it in
            your own words. Campus AI sends it to the right specialist and answers from your own
            material, not a guess.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <PixelButton href="/signup" variant="dark" size="lg">
              Start studying
            </PixelButton>
            <PixelButton href="#how-it-works" variant="secondary" size="lg">
              See how it works
            </PixelButton>
          </div>
          <ul className="mt-9 flex flex-wrap gap-2.5" aria-label="Study specialists">
            {AGENT_TAGS.map((t) => (
              <li key={t}>
                <PixelBadge tone="white">{t}</PixelBadge>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-graph mx-auto w-full max-w-md border-pixel border-brand-black p-6 shadow-pixel-lg sm:p-8">
          <Image
            src={robot.src}
            width={robot.width}
            height={robot.height}
            alt={robot.alt}
            priority
            sizes="(min-width: 1024px) 380px, 80vw"
            className="mx-auto h-auto w-full animate-pixel-float"
          />
        </div>
      </div>
    </PixelSection>
  );
}
