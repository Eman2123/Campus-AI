import type { Config } from "tailwindcss";
import { accent, brand, pixel } from "./lib/design-tokens";

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
        // Pixel redesign (yellow + white + black). Classes: bg-brand-yellow,
        // bg-brand-yellow-soft, text-brand-black, bg-accent-mint, ...
        brand: {
          yellow: brand.yellow,
          // soft / black / white are CSS variables so the dashboard can switch
          // to a dark palette (.app-dark in globals.css). Light values match design-tokens.ts.
          "yellow-soft": "rgb(var(--brand-yellow-soft) / <alpha-value>)",
          "yellow-deep": brand.yellowDeep,
          black: "rgb(var(--brand-black) / <alpha-value>)",
          white: "rgb(var(--brand-white) / <alpha-value>)",
        },
        accent: { ...accent },
      },
      borderWidth: { pixel: `${pixel.border}px` },
      boxShadow: {
        pixel: pixel.shadow.md,
        "pixel-sm": pixel.shadow.sm,
        "pixel-lg": pixel.shadow.lg,
      },
      keyframes: {
        // Everything uses steps() on purpose: smooth easing breaks the pixel feel.
        "pixel-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pixel-blink": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "pixel-pop": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pixel-type": {
          from: { clipPath: "inset(0 100% 0 0)" },
          to: { clipPath: "inset(0 0 0 0)" },
        },
        // Chat polish: new messages rise in, "thinking" dots hop, the speaking
        // equalizer bounces, the recording ring pulses, the bot avatar hops.
        "pixel-rise": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pixel-bounce": {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-5px)" },
        },
        "pixel-eq": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        "pixel-ring": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(1.35)", opacity: "0" },
        },
        "pixel-hop": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
      },
      animation: {
        "pixel-float": "pixel-float 2.4s steps(6, end) infinite",
        "pixel-blink": "pixel-blink 1s steps(1, end) infinite",
        "pixel-pop": "pixel-pop 0.4s steps(4, end) both",
        "pixel-type": "pixel-type 1.6s steps(24, end) both",
        "pixel-rise": "pixel-rise 0.35s steps(5, end) both",
        "pixel-bounce": "pixel-bounce 1s steps(4, end) infinite",
        "pixel-eq": "pixel-eq 0.8s steps(4, end) infinite",
        "pixel-ring": "pixel-ring 1.1s steps(5, end) infinite",
        "pixel-hop": "pixel-hop 0.6s steps(3, end) infinite",
      },
      fontFamily: {
        display: ["var(--font-caslon)", "Georgia", "serif"],
        sans: ["var(--font-work-sans)", "system-ui", "sans-serif"],
        pixel: ["var(--font-pixel)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "38rem",
      },
    },
  },
  plugins: [],
};

export default config;
