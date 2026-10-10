import Image from "next/image";
import { PixelBadge, PixelCard, PixelSection, PixelSectionHeading } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";
import { Reveal } from "./Reveal";

const UPCOMING = [
  { label: "Study session 1/4: Chemistry", date: "Oct 25" },
  { label: "Study session 2/4: Chemistry", date: "Oct 30" },
  { label: "Study session 3/4: Chemistry", date: "Nov 4" },
];

/** Section 7: white + graph. Calendar art plus the "works backward" example. */
export function Planner() {
  const cal = ASSETS.planner.calendar;

  return (
    <PixelSection bg="graph" id="planner">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <PixelSectionHeading
            eyebrow="Planner"
            title="Tell it your exam date. It works backward from there."
            description={"Say \u201Cmy chemistry final is November 14\u201D and Campus AI builds a study schedule leading up to it, saves it, and can export the whole thing as a calendar file you drop into whatever app you already use. No account linking required."}
          />
          <Image
            src={cal.src}
            width={cal.width}
            height={cal.height}
            alt={cal.alt}
            sizes="(min-width: 1024px) 260px, 50vw"
            className="mt-8 h-auto w-48 sm:w-60"
          />
        </Reveal>

        <Reveal delay={120}>
          <PixelCard className="p-0">
            <div className="flex items-center justify-between border-b-pixel border-brand-black bg-brand-yellow px-5 py-3">
              <p className="font-pixel text-base font-bold">Upcoming</p>
              <PixelBadge tone="white">Example</PixelBadge>
            </div>
            <ul className="divide-y-2 divide-brand-black/15 px-5 font-sans text-sm">
              {UPCOMING.map((item) => (
                <li key={item.label} className="flex items-center justify-between py-4">
                  <span>{item.label}</span>
                  <span className="font-pixel font-semibold">{item.date}</span>
                </li>
              ))}
              <li className="flex items-center justify-between py-4">
                <PixelBadge tone="coral">Chemistry Final</PixelBadge>
                <span className="font-pixel font-bold">Nov 14</span>
              </li>
            </ul>
          </PixelCard>
        </Reveal>
      </div>
    </PixelSection>
  );
}
