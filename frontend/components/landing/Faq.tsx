import { Minus, Plus } from "lucide-react";
import { PixelSection, PixelSectionHeading } from "@/components/pixel";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "What can I upload?",
    a: "PDFs, Word documents (.docx), and plain text or Markdown files, up to 20 MB each.",
  },
  {
    q: "Do I have to pick which agent to use?",
    a: "No. Say what you need in plain language and Campus AI routes it to Research, Homework, Quiz, Notes, Flashcards, or Feedback for you.",
  },
  {
    q: "How does it use my notes?",
    a: "Your uploads are processed so Campus AI can search them when you ask something. Answers are built from that material rather than a generic guess.",
  },
  {
    q: "Can I talk instead of type?",
    a: "Yes. Use the mic, speak your question, and you get the same kind of answer you would get from typing it.",
  },
  {
    q: "Can I get my study schedule into my own calendar?",
    a: "Yes. Tell it your exam date, it builds the schedule, and you can export it as a calendar file for the app you already use.",
  },
  {
    q: "Do I need an account?",
    a: "Yes. Create one on the sign-up page, and your conversations and documents stay with it so you can pick up where you left off.",
  },
];

/** Section 9: white + faint graph. Native <details> so it works without JS. */
export function Faq() {
  return (
    <PixelSection bg="graph-faint" id="faq">
      <PixelSectionHeading eyebrow="FAQ" title="Questions, answered" align="center" />
      <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-5">
        {FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details className="group border-pixel border-brand-black bg-brand-white shadow-pixel open:shadow-pixel-lg">
              <summary className="pixel-focus flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-pixel text-lg font-bold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="shrink-0 border-2 border-brand-black bg-brand-yellow p-1" aria-hidden="true">
                  <Plus size={16} strokeWidth={3} className="group-open:hidden" />
                  <Minus size={16} strokeWidth={3} className="hidden group-open:block" />
                </span>
              </summary>
              <p className="border-t-pixel border-brand-black p-5 font-sans text-sm leading-relaxed">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </PixelSection>
  );
}
