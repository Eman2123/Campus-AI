import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

type LegalPageProps = {
  title: string;
  /** ISO date the text was last changed, e.g. "2026-10-12". */
  updated: string;
  children: ReactNode;
  /** Show the closing "Contact" section (hidden on the contact page itself). */
  showContact?: boolean;
  showDate?: boolean;
};

/** Plain, readable frame for the Privacy Policy and Terms of Use. */
export function LegalPage({ title, updated, children, showContact = true, showDate = true }: LegalPageProps) {
  const date = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="min-h-screen bg-brand-white px-6 py-8 text-brand-black sm:px-12">
      <div className="mx-auto w-full max-w-3xl">
        <Logo height={32} />
        <h1 className="mt-10 font-pixel text-4xl font-bold leading-tight">{title}</h1>
        {showDate && <p className="mt-2 font-sans text-sm text-muted-onPaper">Last updated {date}</p>}
        <div className="mt-8 space-y-4 font-sans text-base leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:font-pixel [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
          {showContact && (
            <>
              <h2>Contact</h2>
              <p>
                Questions about this page or your data? Use the <Link href="/contact">contact form</Link>.
              </p>
            </>
          )}
        </div>
        <nav aria-label="Legal" className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t-pixel border-brand-black pt-6 font-pixel text-sm font-semibold">
          <Link href="/" className="pixel-focus hover:underline">
            Home
          </Link>
          <Link href="/privacy" className="pixel-focus hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="pixel-focus hover:underline">
            Terms
          </Link>
          <Link href="/contact" className="pixel-focus hover:underline">
            Contact
          </Link>
        </nav>
      </div>
    </main>
  );
}
