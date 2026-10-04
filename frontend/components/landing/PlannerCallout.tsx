import { SectionHeading } from "@/components/ui/SectionHeading";

const upcoming = [
  { label: "Study session 1/4: Chemistry", date: "Oct 25" },
  { label: "Study session 2/4: Chemistry", date: "Oct 30" },
  { label: "Study session 3/4: Chemistry", date: "Nov 4" },
];

export function PlannerCallout() {
  return (
    <section className="bg-paper px-6 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="Planner"
          title="Tell it your exam date. It works backward from there."
          tone="paper"
          description="Say “my chemistry final is November 14” and Campus AI builds a study schedule leading up to it, saves it, and can export the whole thing as a calendar file you drop into whatever app you already use — no account linking required."
        />
        <div className="rounded-sm border border-ink/10 bg-white p-6">
          <p className="font-sans text-xs text-muted-onPaper">Upcoming</p>
          <ul className="mt-4 space-y-3 font-sans text-sm text-ink">
            {upcoming.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between border-b border-ink/10 pb-3"
              >
                <span>{item.label}</span>
                <span className="text-muted-onPaper">{item.date}</span>
              </li>
            ))}
            <li className="flex items-center justify-between">
              <span className="font-medium text-noteDark-coral">Chemistry Final</span>
              <span className="font-medium text-noteDark-coral">Nov 14</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
