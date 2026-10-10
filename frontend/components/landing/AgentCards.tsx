import Image from "next/image";
import { PixelBadge, PixelCard, PixelSection, PixelSectionHeading } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";
import { Reveal } from "./Reveal";

const AGENTS = [
  {
    name: "Research",
    tone: "sky" as const,
    asset: ASSETS.agents.research,
    body: "Explains a concept clearly, with an example, when you just need to understand something.",
  },
  {
    name: "Homework Helper",
    tone: "yellow" as const,
    asset: ASSETS.agents.homework,
    body: "Walks through a problem step by step and shows its reasoning, not just the final answer.",
  },
  {
    name: "Quiz",
    tone: "coral" as const,
    asset: ASSETS.agents.quizzes,
    body: "Turns your notes into practice questions so you find the gaps before the exam does.",
  },
  {
    name: "Notes",
    tone: "mint" as const,
    asset: ASSETS.agents.notes,
    body: "Summarizes a lecture, chapter, or your own upload into something you'd actually reread.",
  },
  {
    name: "Flashcards",
    tone: "sky" as const,
    asset: ASSETS.agents.flashcards,
    body: "Generates a deck from any topic, one fact per card, ready to drill.",
  },
  {
    name: "Feedback",
    tone: "yellow" as const,
    // Staircase = climbing back up after a wrong answer. Swap if a dedicated icon is made.
    asset: ASSETS.agents.studyPlan,
    body: "Grades your answer, tells you what's wrong, and sends you back to try again if it isn't right yet.",
  },
];

/** Section 5: white + graph paper. Cards stay solid white so the grid never sits behind text. */
export function AgentCards() {
  return (
    <PixelSection bg="graph" id="agents">
      <PixelSectionHeading
        eyebrow="Your study kit"
        title="Six specialists, one conversation"
        description="You never pick an agent. Say what you need in plain language and Campus AI routes it to the one built for that job."
      />
      <ul className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a, i) => (
          <li key={a.name}>
            <Reveal className="h-full" delay={(i % 3) * 100}>
            <PixelCard hoverable className="flex h-full flex-col">
              <Image
                src={a.asset.src}
                width={a.asset.width}
                height={a.asset.height}
                alt=""
                sizes="(min-width: 1024px) 160px, 40vw"
                className="h-36 w-full object-contain"
              />
              <PixelBadge tone={a.tone} className="mt-4 self-start">{a.name}</PixelBadge>
              <p className="mt-3 font-sans text-sm leading-relaxed">{a.body}</p>
            </PixelCard>
            </Reveal>
          </li>
        ))}
      </ul>
    </PixelSection>
  );
}
