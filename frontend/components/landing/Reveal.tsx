"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type State = "shown" | "hidden" | "reveal";

/**
 * Scroll reveal in hard pixel steps (animate-pixel-pop). Progressive on purpose:
 * the server renders content visible; only blocks that start below the fold are
 * hidden after mount, then popped in when scrolled to. Reduced-motion users and
 * no-JS users always see everything.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Stagger in ms. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("shown");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("reveal");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls =
    state === "hidden" ? "opacity-0" : state === "reveal" ? "animate-pixel-pop" : "";

  return (
    <div
      ref={ref}
      className={[cls, className].filter(Boolean).join(" ")}
      style={state === "reveal" && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
