"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PixelButton } from "@/components/pixel";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#agents", label: "Agents" },
  { href: "#planner", label: "Planner" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Landing navbar (section 1): white bar with a thick black bottom border.
 * Sticky, safe-area aware, collapses to a pixel drawer under 768px.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b-pixel border-brand-black bg-brand-white text-brand-black"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8"
      >
        <Logo height={34} />

        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="pixel-focus font-pixel text-base font-semibold hover:underline hover:decoration-[3px] hover:underline-offset-4"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <PixelButton href="/signin" variant="secondary" size="sm">
            Sign in
          </PixelButton>
          <PixelButton href="/signup" size="sm">
            Start studying
          </PixelButton>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="pixel-focus border-pixel border-brand-black bg-brand-yellow p-2 shadow-pixel-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:hidden"
        >
          {open ? <X size={22} strokeWidth={3} /> : <Menu size={22} strokeWidth={3} />}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="border-t-pixel border-brand-black bg-brand-yellow-soft md:hidden"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-5 py-3 sm:px-8">
            {LINKS.map((l) => (
              <li key={l.href} className="border-b-2 border-brand-black/20 last:border-b-0">
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="pixel-focus block py-3 font-pixel text-lg font-semibold"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto flex max-w-6xl gap-3 px-5 pb-5 sm:px-8">
            <PixelButton href="/signin" variant="secondary" className="flex-1">
              Sign in
            </PixelButton>
            <PixelButton href="/signup" className="flex-1">
              Start studying
            </PixelButton>
          </div>
        </div>
      )}
    </header>
  );
}
