/**
 * Design tokens (Day 21) — single source of truth for Campus AI's visual
 * identity. Mirrored into tailwind.config.ts's theme.extend; exported here
 * too for anything that can't consume Tailwind classes directly (canvas/
 * chart rendering, email templates, etc.) further down the roadmap.
 */
export const colors = {
  ink: "#12172B",
  inkSoft: "#1B2140",
  paper: "#EFEAD8",
  paperDim: "#E4DEC8",
  highlighter: "#F5B942",
  note: {
    coral: "#E8735C",
    mint: "#6FBF9B",
    periwinkle: "#7C93E0",
  },
  noteDark: {
    coral: "#B4432E",
    mint: "#2E7D57",
    periwinkle: "#3E4FA0",
  },
  mutedOnDark: "#B9C0D9",
  mutedOnPaper: "#4B5169",
} as const;

export const fonts = {
  display: "var(--font-caslon)",
  sans: "var(--font-work-sans)",
} as const;

/* ------------------------------------------------------------------ *
 * Pixel redesign tokens (yellow + white + black) — see the PRD.
 * Single source of truth: tailwind.config.ts imports these, so a value
 * changes in exactly one place. The legacy ink/paper tokens above stay
 * until every route has migrated (Phases 3-6), then get deleted.
 * ------------------------------------------------------------------ */
export const brand = {
  yellow: "#FACC15", // primary — matches the favicon and the icon set
  yellowSoft: "#FEF9C3", // alternate section background
  yellowDeep: "#F5B800", // side faces / pressed states / robot amber
  black: "#171717", // text, outlines, hard shadows, footer
  white: "#FFFFFF",
} as const;

/** Accent combo A (playful). Tags, badges, icon chips — never big backgrounds. */
export const accent = {
  coral: "#FB7185",
  mint: "#34D399",
  sky: "#38BDF8",
} as const;

export const pixel = {
  /** Border width for every pixel component (px). */
  border: 3,
  /** Hard offset shadows — no blur, ever. */
  shadow: {
    sm: "2px 2px 0 0 #171717",
    md: "4px 4px 0 0 #171717",
    lg: "6px 6px 0 0 #171717",
  },
  /** Graph-paper background: minor cell and major (every 4th line) cell. */
  graph: { cell: 32, major: 128 },
} as const;

export const pixelFonts = {
  pixel: "var(--font-pixel)", // headings and short labels only
} as const;
