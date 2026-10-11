import { PixelButton, PixelCard } from "@/components/pixel";

export default function NotFound() {
  return (
    <main className="bg-graph grid min-h-screen place-items-center px-5 font-sans text-brand-black">
      <PixelCard className="max-w-md text-center">
        <p className="font-pixel text-6xl font-bold">404</p>
        <h1 className="mt-2 font-pixel text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-onPaper">This page does not exist or has moved.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <PixelButton href="/">Go home</PixelButton>
          <PixelButton variant="secondary" href="/dashboard">Open dashboard</PixelButton>
        </div>
      </PixelCard>
    </main>
  );
}
