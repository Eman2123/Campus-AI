import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PixelIconName =
  | "speaker"
  | "stop"
  | "copy"
  | "check"
  | "send"
  | "mic"
  | "attach"
  | "menu"
  | "close"
  | "bot";

// 24x24 grid, 2.5px square-capped strokes: chunky and blocky to match the
// pixel look. Icons inherit `currentColor`, so they follow light/dark theme.
const shapes: Record<PixelIconName, ReactNode> = {
  speaker: <path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />,
  stop: <rect x="6" y="6" width="12" height="12" fill="currentColor" />,
  copy: <path d="M9 9h11v11H9zM5 15V4h11" />,
  check: <path d="M4 12l5 5L20 6" />,
  send: <path d="M4 12h15M13 6l6 6-6 6" />,
  mic: <path d="M9 3h6v12H9zM5 11a7 7 0 0014 0M12 18v3" />,
  attach: <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 01-8-8l9-9a3.5 3.5 0 015 5l-9 9a1.5 1.5 0 01-2-2l8-8" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  bot: (
    <>
      <path d="M4 8h16v11H4zM12 8V4" />
      <rect x="8" y="12" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <rect x="13.5" y="12" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
    </>
  ),
};

/** Small decorative icon. Always pair it with a text label or an aria-label on the button. */
export function PixelIcon({ name, size = 16, className }: { name: PixelIconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {shapes[name]}
    </svg>
  );
}
