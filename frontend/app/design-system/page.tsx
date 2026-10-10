import Image from "next/image";
import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import {
  PixelBadge,
  PixelButton,
  PixelCard,
  PixelFrame,
  PixelSection,
  PixelSectionHeading,
  type SectionBg,
} from "@/components/pixel";
import { ASSETS } from "@/lib/assets";
import { accent, brand } from "@/lib/design-tokens";

// Internal reference page for the redesign. Not linked anywhere, not indexed.
export const metadata: Metadata = {
  title: "Design system — Campus AI",
  robots: { index: false, follow: false },
};

const SWATCHES: { name: string; hex: string; text?: string }[] = [
  { name: "yellow", hex: brand.yellow },
  { name: "yellow-soft", hex: brand.yellowSoft },
  { name: "yellow-deep", hex: brand.yellowDeep },
  { name: "black", hex: brand.black, text: "#fff" },
  { name: "white", hex: brand.white },
  { name: "coral", hex: accent.coral },
  { name: "mint", hex: accent.mint },
  { name: "sky", hex: accent.sky },
];

const RHYTHM: { bg: SectionBg; label: string }[] = [
  { bg: "yellow", label: "2 Hero" },
  { bg: "graph", label: "3 Problem" },
  { bg: "soft", label: "4 How it works" },
  { bg: "graph", label: "5 Agents" },
  { bg: "yellow", label: "6 Chat demo" },
  { bg: "graph", label: "7 Planner" },
  { bg: "soft", label: "8 Voice + Docs" },
  { bg: "graph-faint", label: "9 FAQ" },
  { bg: "yellow", label: "10 Final CTA" },
  { bg: "black", label: "Footer" },
];

function assetList() {
  const out: { key: string; src: string; w: number; h: number; alt: string }[] = [];
  for (const [group, items] of Object.entries(ASSETS)) {
    for (const [name, a] of Object.entries(items)) {
      out.push({ key: `${group}.${name}`, src: a.src, w: a.width, h: a.height, alt: a.alt });
    }
  }
  return out;
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-brand-white font-sans text-brand-black">
      <Navbar />

      <PixelSection bg="yellow">
        <PixelBadge tone="black" className="mb-4">Internal</PixelBadge>
        <h1 className="font-pixel text-4xl font-bold leading-tight sm:text-6xl">
          Campus AI design system
        </h1>
        <p className="mt-4 max-w-2xl text-lg">
          Yellow, white and black. Hard borders, hard shadows, steps() motion. Pixel font for
          headings and labels only; Work Sans for everything you read.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <PixelButton size="lg" variant="dark" href="#buttons">Buttons</PixelButton>
          <PixelButton size="lg" variant="secondary" href="#rhythm">Section rhythm</PixelButton>
        </div>
      </PixelSection>

      <PixelSection bg="graph">
        <PixelSectionHeading eyebrow="Colors" title="Palette" description="60% white/yellow, 30% black, 10% accent. Text stays black, even on accents." />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SWATCHES.map((s) => (
            <div key={s.name} className="border-pixel border-brand-black bg-brand-white shadow-pixel">
              <div className="h-20 border-b-pixel border-brand-black" style={{ background: s.hex }} />
              <div className="p-3">
                <p className="font-pixel text-sm font-semibold">{s.name}</p>
                <p className="font-mono text-xs">{s.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </PixelSection>

      <PixelSection bg="soft" id="buttons">
        <PixelSectionHeading eyebrow="Components" title="Buttons, badges, cards" description="Hover nudges toward the shadow. Click sinks it. No easing." />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <PixelButton size="sm">Small</PixelButton>
          <PixelButton>Primary</PixelButton>
          <PixelButton variant="secondary">Secondary</PixelButton>
          <PixelButton variant="dark" size="lg">Dark large</PixelButton>
          <PixelButton disabled>Disabled</PixelButton>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <PixelBadge>yellow</PixelBadge>
          <PixelBadge tone="coral">coral</PixelBadge>
          <PixelBadge tone="mint">mint</PixelBadge>
          <PixelBadge tone="sky">sky</PixelBadge>
          <PixelBadge tone="black">black</PixelBadge>
          <PixelBadge tone="white">white</PixelBadge>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <PixelCard hoverable>
            <PixelBadge tone="mint">Research</PixelBadge>
            <h3 className="mt-3 font-pixel text-xl font-bold">White card</h3>
            <p className="mt-2 text-sm">Solid background so graph paper never sits behind text.</p>
          </PixelCard>
          <PixelCard tone="yellow" hoverable>
            <PixelBadge tone="black">Quizzes</PixelBadge>
            <h3 className="mt-3 font-pixel text-xl font-bold">Yellow card</h3>
            <p className="mt-2 text-sm">For emphasis on white sections.</p>
          </PixelCard>
          <PixelFrame title="chat.exe">
            <p className="text-sm">Window frame for the chat demo and screenshot-like content.</p>
          </PixelFrame>
        </div>
      </PixelSection>

      <PixelSection bg="graph" id="rhythm">
        <PixelSectionHeading eyebrow="Layout" title="Section rhythm" description="Alternating backgrounds. Graph paper only on white sections; it fades at the top and bottom edge." />
      </PixelSection>
      {RHYTHM.map((r, i) => (
        <PixelSection key={i} bg={r.bg} className="!py-10">
          <div className="flex items-center justify-between gap-4">
            <span className="font-pixel text-lg font-semibold">{r.label}</span>
            <PixelBadge tone={r.bg === "black" ? "yellow" : "black"}>{r.bg}</PixelBadge>
          </div>
        </PixelSection>
      ))}

      <PixelSection bg="graph">
        <PixelSectionHeading eyebrow="Motion" title="Hero float" description="steps() keyframes: the robot bobs in 6 hard steps. Disabled automatically for reduced-motion users." />
        <div className="mt-8 flex justify-center">
          <Image
            src={ASSETS.hero.robot.src}
            width={ASSETS.hero.robot.width}
            height={ASSETS.hero.robot.height}
            alt={ASSETS.hero.robot.alt}
            priority
            className="h-72 w-72 animate-pixel-float object-contain"
          />
        </div>
      </PixelSection>

      <PixelSection bg="soft">
        <PixelSectionHeading eyebrow="Assets" title="Asset library" description="Everything in lib/assets.ts, rendered on soft yellow." />
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {assetList().map((a) => (
            <PixelCard key={a.key} className="flex flex-col items-center p-3">
              <Image src={a.src} width={a.w} height={a.h} alt={a.alt} className="h-32 w-full object-contain" />
              <p className="mt-2 font-mono text-[11px]">{a.key}</p>
            </PixelCard>
          ))}
        </div>
      </PixelSection>

      <PixelSection bg="black">
        <p className="font-pixel text-sm">Campus AI · design system v1</p>
      </PixelSection>
    </div>
  );
}
