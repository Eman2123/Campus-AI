import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "yellow" | "coral" | "mint" | "sky" | "black" | "white";

const tones: Record<Tone, string> = {
  yellow: "bg-brand-yellow text-brand-black",
  coral: "bg-accent-coral text-brand-black",
  mint: "bg-accent-mint text-brand-black",
  sky: "bg-accent-sky text-brand-black",
  black: "bg-brand-black text-brand-yellow",
  white: "bg-brand-white text-brand-black",
};

/** Small label chip. Text stays black on accents (contrast); only the black badge flips. */
export function PixelBadge({
  tone = "yellow",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 border-brand-black px-2 py-0.5 font-pixel text-xs font-semibold uppercase leading-tight tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
