"use client";

import { PixelButton, PixelCard } from "@/components/pixel";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="bg-graph grid min-h-screen place-items-center px-5 font-sans text-brand-black">
      <PixelCard className="max-w-md text-center">
        <h1 className="font-pixel text-2xl font-bold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-onPaper">An unexpected error happened. Try again, and if it keeps happening, reload the page.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <PixelButton onClick={reset}>Try again</PixelButton>
          <PixelButton variant="secondary" href="/">Go home</PixelButton>
        </div>
      </PixelCard>
    </main>
  );
}
