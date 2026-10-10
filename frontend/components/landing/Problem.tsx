import Image from "next/image";
import { PixelBadge, PixelCard, PixelSection, PixelSectionHeading } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";
import { Reveal } from "./Reveal";

const PAINS = [
  {
    badge: "Scattered",
    tone: "coral" as const,
    title: "Everything is everywhere",
    body: "Slides in one folder, PDFs in another, notes on your phone. Finding the right page takes longer than reading it.",
  },
  {
    badge: "Deadlines",
    tone: "yellow" as const,
    title: "Deadlines don't wait",
    body: "Exams and assignments pile up, and it's hard to tell what to study first.",
  },
  {
    badge: "Off-target",
    tone: "sky" as const,
    title: "Generic answers don't fit",
    body: "A chatbot that never saw your syllabus guesses. You need answers that match your course.",
  },
];

/** Section 3: white + graph paper. */
export function Problem() {
  const desk = ASSETS.problem.desk;

  return (
    <PixelSection bg="graph" id="problem">
      <PixelSectionHeading
        eyebrow="The problem"
        title="Studying shouldn't feel like this"
        description="Your coursework is scattered, your deadlines keep moving closer, and a generic chatbot has never seen your syllabus."
      />
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <Image
          src={desk.src}
          width={desk.width}
          height={desk.height}
          alt={desk.alt}
          sizes="(min-width: 1024px) 560px, 90vw"
          className="mx-auto h-auto w-full max-w-xl [-webkit-mask-image:linear-gradient(to_bottom,#000_82%,transparent)] [mask-image:linear-gradient(to_bottom,#000_82%,transparent)]"
        />
        <ul className="flex flex-col gap-5">
          {PAINS.map((p, i) => (
            <li key={p.title}>
              <Reveal delay={i * 100}>
              <PixelCard>
                <PixelBadge tone={p.tone}>{p.badge}</PixelBadge>
                <h3 className="mt-3 font-pixel text-xl font-bold">{p.title}</h3>
                <p className="mt-2 font-sans text-sm leading-relaxed">{p.body}</p>
              </PixelCard>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </PixelSection>
  );
}
