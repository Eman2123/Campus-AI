import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Landing-page section wrapper. The background IS the rhythm:
 * Y, W, soft-Y, W, Y, W, soft-Y, W, Y, black. Never two of the same in a row.
 *   yellow      solid, no grid
 *   soft        solid soft yellow, no grid
 *   white       solid white
 *   graph       white + graph paper  (Problem, Agents, Planner)
 *   graph-faint white + very light graph paper (FAQ)
 *   black       footer
 */
export type SectionBg = "yellow" | "soft" | "white" | "graph" | "graph-faint" | "black";

const backgrounds: Record<SectionBg, string> = {
  yellow: "bg-brand-yellow text-brand-black",
  soft: "bg-brand-yellow-soft text-brand-black",
  white: "bg-brand-white text-brand-black",
  graph: "bg-graph text-brand-black",
  "graph-faint": "bg-graph bg-graph-faint text-brand-black",
  black: "bg-brand-black text-brand-white",
};

export function PixelSection({
  as: Tag = "section",
  bg = "white",
  id,
  className,
  innerClassName,
  children,
}: {
  as?: ElementType;
  bg?: SectionBg;
  id?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={cn("scroll-mt-20 py-16 sm:py-24", backgrounds[bg], className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", innerClassName)}>
        {children}
      </div>
    </Tag>
  );
}
