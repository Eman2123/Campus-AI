import Image from "next/image";
import { PixelBadge, PixelCard, PixelSection, PixelSectionHeading } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    step: "Step 1",
    tone: "coral" as const,
    asset: ASSETS.steps.upload,
    title: "Bring your material",
    body: "Upload a PDF, Word doc, or plain notes, or just start typing or talking. Nothing to configure.",
  },
  {
    step: "Step 2",
    tone: "sky" as const,
    asset: ASSETS.steps.ask,
    title: "Ask like you would a classmate",
    body: "\u201cExplain this proof again,\u201d \u201cquiz me on chapter 4,\u201d \u201cwhat\u2019s actually due this week.\u201d Campus AI figures out which specialist should answer.",
  },
  {
    step: "Step 3",
    tone: "mint" as const,
    asset: ASSETS.steps.answer,
    title: "Get an answer grounded in your own work",
    body: "Homework walkthroughs, flashcards, summaries, and study plans reference the material you gave it, not a generic answer from the open web.",
  },
];

/** Section 4: soft yellow. Three white step cards. */
export function HowItWorks() {
  return (
    <PixelSection bg="soft" id="how-it-works">
      <PixelSectionHeading eyebrow="How it works" title="Three steps, no setup" align="center" />
      <ol className="mt-14 grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Reveal className="h-full" delay={i * 120}>
            <PixelCard className="flex h-full flex-col items-start">
              <Image
                src={s.asset.src}
                width={s.asset.width}
                height={s.asset.height}
                alt={s.asset.alt}
                sizes="(min-width: 768px) 220px, 60vw"
                className="mx-auto h-40 w-auto"
              />
              <PixelBadge tone={s.tone} className="mt-5">{s.step}</PixelBadge>
              <h3 className="mt-3 font-pixel text-xl font-bold leading-snug">{s.title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed">{s.body}</p>
            </PixelCard>
            </Reveal>
          </li>
        ))}
      </ol>
    </PixelSection>
  );
}
