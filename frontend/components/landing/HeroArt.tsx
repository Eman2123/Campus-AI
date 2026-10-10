import Image from "next/image";
import { PixelBadge } from "@/components/pixel";

/**
 * Hero art (calm version): one photo in a window frame, one isometric cap
 * peeking over the corner, and two sticker tags. The cap bobs in hard steps;
 * everything else is still. Reduced-motion users get no bobbing at all
 * (globals.css turns every animation off).
 */
export function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] px-4 pb-10 pt-12 sm:px-6">
      <div className="-rotate-[1.5deg] border-pixel border-brand-black bg-brand-white shadow-pixel-lg">
        <div className="flex items-center gap-2.5 border-b-pixel border-brand-black bg-brand-yellow px-3 py-1.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 border-2 border-brand-black bg-brand-white" />
            <span className="h-3 w-3 border-2 border-brand-black bg-brand-white" />
            <span className="h-3 w-3 border-2 border-brand-black bg-brand-black" />
          </div>
          <span className="font-pixel text-xs font-semibold leading-none">study_session</span>
        </div>
        <Image
          src="/assets/hero/photo-main.webp"
          width={960}
          height={640}
          priority
          alt="Three students studying together around a laptop in a campus library"
          sizes="(min-width: 1024px) 540px, 90vw"
          className="block h-auto w-full"
        />
      </div>

      {/* Isometric cap: wrapper tilts, inner element bobs (they must not share a transform) */}
      <div className="absolute right-0 top-0 w-[21%] rotate-3">
        <div className="animate-pixel-float">
          <Image
            src="/assets/hero/obj-cap-c.webp"
            width={207}
            height={368}
            alt=""
            aria-hidden="true"
            sizes="120px"
            className="h-auto w-full [filter:drop-shadow(3px_3px_0_#171717)]"
          />
        </div>
      </div>

      <PixelBadge tone="mint" className="absolute bottom-24 right-2 rotate-[4deg] shadow-pixel-sm sm:right-0">
        Reads your PDFs
      </PixelBadge>
      <PixelBadge tone="coral" className="absolute bottom-4 left-0 -rotate-[4deg] shadow-pixel-sm">
        Exam in 3 days
      </PixelBadge>
    </div>
  );
}
