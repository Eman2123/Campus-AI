import { SectionHeading } from "@/components/ui/SectionHeading";

const agents = [
  {
    name: "Research",
    color: "bg-note-periwinkle",
    rotate: -3,
    body: "Explains a concept clearly, with an example, when you just need to understand something.",
  },
  {
    name: "Homework Helper",
    color: "bg-highlighter",
    rotate: 2,
    body: "Walks through a problem step by step and shows its reasoning, not just the final answer.",
  },
  {
    name: "Quiz",
    color: "bg-note-coral",
    rotate: -1,
    body: "Turns your notes into practice questions so you find the gaps before the exam does.",
  },
  {
    name: "Notes",
    color: "bg-note-mint",
    rotate: 3,
    body: "Summarizes a lecture, chapter, or your own upload into something you'd actually reread.",
  },
  {
    name: "Flashcards",
    color: "bg-note-periwinkle",
    rotate: 1,
    body: "Generates a deck from any topic \u2014 one fact per card, ready to drill.",
  },
  {
    name: "Feedback",
    color: "bg-highlighter",
    rotate: -2,
    body: "Grades your answer, tells you what's wrong, and sends you back to try again if it isn't right yet.",
  },
];

export function AgentCards() {
  return (
    <section className="bg-ink-soft px-6 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Your study kit"
          title="Six specialists, one conversation"
          description="You never pick an agent. Say what you need in plain language and Campus AI routes it to the one built for that job."
        />
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="rounded-sm bg-paper p-6 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
              style={{ transform: `rotate(${agent.rotate}deg)` }}
            >
              <span className={`inline-block h-2 w-10 rounded-full ${agent.color}`} />
              <h3 className="mt-4 font-display text-lg text-ink">{agent.name}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted-onPaper">
                {agent.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
