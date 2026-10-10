"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, SendHorizontal, FileText } from "lucide-react";
import { PixelBadge, PixelButton, PixelFrame } from "@/components/pixel";

const USER_TEXT = "Quiz me on chapter 4 of my biology notes.";
const REPLY =
  "Question 1 of 5, from your notes:\nWhat is the main job of the mitochondria?\nA) Make proteins\nB) Produce ATP\nC) Store DNA\nD) Digest waste";

type Step = "idle" | "user" | "thinking" | "reply" | "done";

/**
 * Scripted, decorative chat. Plays once when scrolled into view, types the reply
 * in 2-character steps, and shows everything instantly for reduced-motion users.
 */
export function ChatDemoWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [chars, setChars] = useState(0);

  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const play = useCallback(() => {
    clear();
    setChars(0);
    setStep("user");
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(900, () => setStep("thinking"));
    at(1900, () => {
      setStep("reply");
      let n = 0;
      const tick = () => {
        n += 2;
        setChars(n);
        if (n >= REPLY.length) setStep("done");
        else timers.current.push(window.setTimeout(tick, 28));
      };
      tick();
    });
  }, [clear]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChars(REPLY.length);
      setStep("done");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [play, clear]);

  const showUser = step !== "idle";
  const showAgent = step === "thinking" || step === "reply" || step === "done";

  return (
    <div ref={rootRef}>
      <PixelFrame title="campus-ai / chat" className="mx-auto w-full max-w-xl">
        <div
          role="img"
          aria-label="Example conversation: a student asks Campus AI to quiz them on chapter 4 of their biology notes, and the Quiz agent asks a question from those notes."
          className="flex min-h-[19rem] flex-col gap-4"
        >
          {showUser && (
            <div className="ml-auto max-w-[85%] animate-pixel-pop border-pixel border-brand-black bg-brand-yellow p-3 font-sans text-sm shadow-pixel-sm">
              <p className="mb-2 inline-flex items-center gap-1.5 border-2 border-brand-black bg-brand-white px-2 py-0.5 font-pixel text-xs font-semibold">
                <FileText size={12} strokeWidth={3} aria-hidden="true" />
                bio-ch4-notes.pdf
              </p>
              <p>{USER_TEXT}</p>
            </div>
          )}

          {showAgent && (
            <div className="mr-auto max-w-[90%] animate-pixel-pop border-pixel border-brand-black bg-brand-white p-3 font-sans text-sm shadow-pixel-sm">
              <PixelBadge tone="coral" className="mb-2">Quiz agent</PixelBadge>
              {step === "thinking" ? (
                <p className="flex gap-1.5 py-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2.5 w-2.5 animate-pixel-blink bg-brand-black"
                      style={{ animationDelay: `${i * 250}ms` }}
                    />
                  ))}
                </p>
              ) : (
                <p className="whitespace-pre-line leading-relaxed">{REPLY.slice(0, chars)}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-pixel border-brand-black bg-brand-yellow-soft p-2" aria-hidden="true">
          <span className="flex-1 px-2 font-sans text-sm text-brand-black/60">Ask about your notes…</span>
          <span className="border-2 border-brand-black bg-brand-white p-1.5"><Mic size={16} strokeWidth={3} /></span>
          <span className="border-2 border-brand-black bg-brand-yellow p-1.5"><SendHorizontal size={16} strokeWidth={3} /></span>
        </div>

        {/* Always rendered (invisible until done) so the window never changes height. */}
        <div className={`mt-4 flex justify-end ${step === "done" ? "" : "invisible"}`}>
          <PixelButton size="sm" variant="secondary" onClick={play} tabIndex={step === "done" ? 0 : -1}>
            Replay
          </PixelButton>
        </div>
      </PixelFrame>
    </div>
  );
}
