import Link from "next/link";

import { Button } from "@/components/ui/Button";

const agentTags = [
  { label: "Research", color: "border-note-periwinkle text-note-periwinkle" },
  { label: "Homework", color: "border-highlighter text-highlighter" },
  { label: "Quizzes", color: "border-note-coral text-note-coral" },
  { label: "Notes", color: "border-note-mint text-note-mint" },
  { label: "Flashcards", color: "border-note-periwinkle text-note-periwinkle" },
  { label: "Study plans", color: "border-highlighter text-highlighter" },
];

export function Hero() {
  return (
    <section className="rule-lines relative border-b border-paper/10 px-6 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex items-center justify-between">
          <p className="font-sans text-sm text-muted-onDark">Campus AI</p>
          <Link href="/signin" className="font-sans text-sm text-paper underline underline-offset-4">
            Sign in
          </Link>
        </div>

        <div className="grid gap-16 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div>
            <h1 className="font-display text-4xl leading-[1.1] text-paper sm:text-5xl lg:text-6xl">
              Study help that actually reads your coursework.
            </h1>
            <p className="mt-6 max-w-prose font-sans text-lg leading-relaxed text-muted-onDark">
              Upload a syllabus, a problem set, a stack of lecture notes. Ask a
              question out loud or type it in your own words. Campus AI routes
              it to the right specialist — homework, quizzes, flashcards,
              summaries, or a backward-planned study schedule — and answers
              grounded in your own material, not a guess.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button href="/signup">Start studying</Button>
              <Button href="#how-it-works" variant="ghost">
                See how it works
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            {agentTags.map((tag, i) => (
              <span
                key={tag.label}
                className={`rounded-sm border bg-ink-soft px-4 py-2 font-sans text-sm ${tag.color}`}
                style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
