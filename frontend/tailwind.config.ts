import type { Config } from "tailwindcss";

// Day 21 design tokens. The brief is a study tool, not a generic SaaS
// product, so the palette is grounded in actual study materials — an
// ink-navy "notebook at midnight" base, a warm paper/index-card surface,
// and a highlighter-amber accent — rather than the cream+terracotta or
// near-black+neon defaults. `note` is the light, saturated set used on
// the dark ink background (tags, dots); `noteDark` is the same three
// hues deepened for legibility on the light paper background.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12172B",
          soft: "#1B2140",
        },
        paper: {
          DEFAULT: "#EFEAD8",
          dim: "#E4DEC8",
        },
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
        muted: {
          onDark: "#B9C0D9",
          onPaper: "#4B5169",
        },
      },
      fontFamily: {
        display: ["var(--font-caslon)", "Georgia", "serif"],
        sans: ["var(--font-work-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "38rem",
      },
    },
  },
  plugins: [],
};

export default config;
