"use client";

import { useEffect, useState } from "react";
import { PixelBadge, PixelFrame } from "@/components/pixel";

const QUESTION = "Quiz me on week 4.";
const ANSWER = "Week 4 covers cell respiration. Here are 3 questions from your Lecture 6 notes.";

const FRAME_MS = 120;
const LOOP_FRAMES = 112; // ~13s, with a long hold on the finished answer
const FINISHED_FRAME = 100; // what reduced-motion visitors see: the whole exchange, still

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

/**
 * A looping, typed-out demo of the product: a question, the specialist that
 * picks it up, an answer, and the source it came from. Purely decorative
 * (hidden from assistive tech) and drawn in code, so it costs no bandwidth.
 *
 * Timeline, in 120ms frames: question types out → agent badge → answer
 * types out → source card → follow-up buttons → hold → repeat.
 */
export function ChatLoop() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFrame(FINISHED_FRAME);
      return;
    }
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % LOOP_FRAMES), FRAME_MS);
    return () => window.clearInterval(timer);
  }, []);

  const questionChars = clamp(frame - 2, QUESTION.length);
  const answerChars = clamp((frame - 26) * 2, ANSWER.length);

  const showQuestion = frame >= 2;
  const showAgent = frame >= 24;
  const showSource = frame >= 70;
  const showChips = frame >= 76;

  const questionText = QUESTION.slice(0, questionChars) + (showQuestion && questionChars < QUESTION.length ? "▌" : "");
  const answerText = ANSWER.slice(0, answerChars) + (frame >= 26 && answerChars < ANSWER.length ? "▌" : "");

  return (
    <PixelFrame title="campus_ai / chat" className="-rotate-[1.5deg]">
      <div aria-hidden="true" className="flex min-h-[320px] flex-col gap-3">
        {showQuestion && (
          <div className="max-w-[85%] self-end bg-brand-black px-3.5 py-2.5 font-sans text-[15px] leading-snug text-brand-white">
            {questionText}
          </div>
        )}
        {showAgent && (
          <div className="flex flex-col gap-2">
            <PixelBadge tone="mint" className="self-start">
              Quiz agent
            </PixelBadge>
            <div className="min-h-[72px] border-2 border-brand-black bg-brand-yellow-soft px-3.5 py-3 font-sans text-[14.5px] leading-normal">
              {answerText}
            </div>
          </div>
        )}
        {showSource && (
          <div className="flex items-center gap-2.5 border-2 border-brand-black bg-brand-white px-2.5 py-2">
            <PixelBadge tone="sky" className="font-bold">
              PDF
            </PixelBadge>
            <div className="font-sans text-[13px] leading-tight">
              <strong className="font-semibold">Bio101_Lecture6.pdf</strong>
              <br />
              <span className="text-muted-onPaper">Slide 12 · matched in your upload</span>
            </div>
          </div>
        )}
        {showChips && (
          <div className="flex flex-wrap gap-2 font-pixel text-[13px] font-semibold">
            {["Next question", "Flashcards", "Add to plan"].map((chip) => (
              <span key={chip} className="border-2 border-brand-black bg-brand-white px-3 py-1">
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </PixelFrame>
  );
}
