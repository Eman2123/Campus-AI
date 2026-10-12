"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PixelButton } from "@/components/pixel";

const KEY = "campus-ai:notice-ok";

/**
 * One-time notice about browser storage. Campus AI only uses storage that
 * the app needs (staying signed in, remembering settings) plus cookie-free
 * page-view counts, so this is informational with a single "Got it"; there
 * is nothing optional to switch off. Remembered in localStorage (wrapped in
 * try/catch: storage can be blocked), so it never nags twice.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function accept() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Not saved: the notice will simply show again next visit.
    }
    setShow(false);
  }

  return (
    <aside
      role="region"
      aria-label="Cookies and storage"
      className="fixed inset-x-3 bottom-3 z-[60] border-pixel border-brand-black bg-brand-white p-4 font-sans text-sm text-brand-black shadow-pixel sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-sm"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <p className="leading-relaxed">
        We only use browser storage to keep you signed in and remember your settings, plus simple page-view counts with no ad
        or cross-site tracking.{" "}
        <Link href="/privacy" className="pixel-focus font-semibold underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
      <PixelButton size="sm" className="mt-3" onClick={accept}>
        Got it
      </PixelButton>
    </aside>
  );
}
