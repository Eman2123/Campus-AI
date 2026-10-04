import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    step: "Step 1",
    title: "Bring your material",
    body: "Upload a PDF, Word doc, or plain notes — or just start typing or talking. Nothing to configure.",
  },
  {
    step: "Step 2",
    title: "Ask like you would a classmate",
    body: "\u201cExplain this proof again,\u201d \u201cquiz me on chapter 4,\u201d \u201cwhat's actually due this week\u201d \u2014 Campus AI figures out which specialist should answer.",
  },
  {
    step: "Step 3",
    title: "Get an answer grounded in your own work",
    body: "Homework walkthroughs, flashcards, summaries, and study plans reference the material you gave it \u2014 not a generic answer from the open web.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-paper px-6 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="How it works" title="Three steps, no setup" tone="paper" />
        <div className="mt-14 grid gap-px overflow-hidden rounded-sm bg-ink/10 sm:grid-cols-3">
          {steps.map((item) => (
            <div key={item.title} className="bg-paper p-8">
              <p className="font-sans text-sm text-noteDark-coral">{item.step}</p>
              <h3 className="mt-3 font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted-onPaper">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
