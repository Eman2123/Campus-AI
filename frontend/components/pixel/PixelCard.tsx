import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "white" | "yellow" | "soft";

type PixelCardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: Tone;
  /** Step-style lift on hover (for clickable / feature cards). */
  hoverable?: boolean;
  children: ReactNode;
};

const tones: Record<Tone, string> = {
  white: "bg-brand-white",
  yellow: "bg-brand-yellow",
  soft: "bg-brand-yellow-soft",
};

/** Solid card: black outline + hard shadow. Always solid so graph paper never shows through text. */
export function PixelCard({
  as: Tag = "div",
  tone = "white",
  hoverable = false,
  className,
  children,
  ...rest
}: PixelCardProps) {
  return (
    <Tag
      className={cn(
        "border-pixel border-brand-black p-6 text-brand-black shadow-pixel",
        tones[tone],
        hoverable &&
          "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pixel-lg",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
