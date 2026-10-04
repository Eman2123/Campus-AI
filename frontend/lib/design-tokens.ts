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
