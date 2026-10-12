"use client";

import { useEffect, useState } from "react";

import { PixelButton } from "@/components/pixel";

/**
 * Phone-only bar pinned to the bottom with the main call to action. Appears
 * once the hero is out of view and tucks away again when the closing CTA
 * section (#start) is on screen, so it never duplicates a visible button.
 */
export function MobileStickyCta() {
  const [pastHero, setPastHero] = useState(false);
  const [closingVisible, setClosingVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const closing = document.getElementById("start");
    const observer = closing ? new IntersectionObserver(([entry]) => setClosingVisible(entry.isIntersecting)) : null;
    if (closing && observer) observer.observe(closing);

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  const visible = pastHero && !closingVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t-pixel border-brand-black bg-brand-white px-4 pt-3 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      } transition-transform duration-200`}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <PixelButton href="/signup" size="md" className="w-full" tabIndex={visible ? 0 : -1}>
        Start studying
      </PixelButton>
    </div>
  );
}
