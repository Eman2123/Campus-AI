import { ArrowUp } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

const EXPLORE = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#agents", label: "Agents" },
  { href: "#planner", label: "Study planner" },
  { href: "#faq", label: "FAQ" },
];

const ACCOUNT = [
  { href: "/signin", label: "Sign in" },
  { href: "/signup", label: "Create account" },
];

const AGENTS = ["Research", "Homework", "Quizzes", "Notes", "Flashcards", "Study plans"];

const linkClass =
  "pixel-focus font-sans text-base text-brand-white underline-offset-4 hover:text-brand-yellow hover:underline hover:decoration-[3px] focus-visible:outline-brand-yellow";

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-pixel text-lg font-semibold text-brand-yellow">{title}</h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}

/** Section 10b: black footer under a pixel checker strip. The logo has dark text, so it sits on a white plate. */
export function Footer() {
  return (
    <footer className="bg-brand-black text-brand-white">
      {/* Checker strip: pure CSS, decorative. */}
      <div
        aria-hidden="true"
        className="h-4 w-full"
        style={{
          backgroundImage:
            "conic-gradient(#FACC15 25%, #171717 0 50%, #FACC15 0 75%, #171717 0)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <div className="inline-block border-pixel border-brand-white bg-brand-white px-3 py-2 shadow-[4px_4px_0_0_#FACC15]">
              <Logo height={30} />
            </div>
            <p className="mt-5 max-w-xs font-sans text-base text-brand-white/80">
              Study help that reads your own notes. Built for the coursework you actually have.
            </p>
            <Link
              href="/signup"
              className="pixel-focus mt-6 inline-flex items-center border-pixel border-brand-yellow bg-brand-yellow px-5 py-2.5 font-pixel text-base font-semibold leading-none text-brand-black shadow-[4px_4px_0_0_#FFFFFF] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FFFFFF] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline-brand-yellow"
            >
              Start studying
            </Link>
          </div>

          <nav aria-label="Explore">
            <FooterColumn title="Explore">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>
          </nav>

          <nav aria-label="Account">
            <FooterColumn title="Account">
              {ACCOUNT.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>
          </nav>

          <div>
            <h2 className="font-pixel text-lg font-semibold text-brand-yellow">6 study agents</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {AGENTS.map((name) => (
                <li key={name}>
                  <Link
                    href="#agents"
                    className="pixel-focus inline-block border-2 border-brand-white/40 px-2.5 py-1 font-pixel text-sm font-semibold text-brand-white hover:border-brand-yellow hover:text-brand-yellow focus-visible:outline-brand-yellow"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-sans text-sm text-brand-white/80">
              PDF, DOCX and TXT uploads. Voice input.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t-2 border-brand-white/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-sm text-brand-white/80">&copy; {new Date().getFullYear()} Campus AI</p>
          <a
            href="#"
            className="pixel-focus inline-flex items-center gap-2 self-start font-pixel text-sm font-semibold text-brand-yellow hover:underline hover:decoration-[3px] hover:underline-offset-4 focus-visible:outline-brand-yellow sm:self-auto"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
