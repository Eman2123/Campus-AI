import Image from "next/image";
import { PixelButton, PixelSection } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";

/** Section 10a: yellow closing CTA. Reuses the hero robot (no extra asset). */
export function CtaSection() {
  const robot = ASSETS.hero.robot;

  return (
    <PixelSection bg="yellow" id="start">
      <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="font-pixel text-4xl font-bold leading-tight sm:text-5xl">
            Ready to study with your own notes?
          </h2>
          <p className="mt-4 max-w-xl font-sans text-lg leading-relaxed">
            Create an account, upload what you have, and ask your first question.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PixelButton href="/signup" variant="dark" size="lg">
              Start studying
            </PixelButton>
            <PixelButton href="/signin" variant="secondary" size="lg">
              Sign in
            </PixelButton>
          </div>
        </div>
        <Image
          src={robot.src}
          width={robot.width}
          height={robot.height}
          alt=""
          sizes="220px"
          className="mx-auto h-auto w-44 animate-pixel-float md:w-56"
        />
      </div>
    </PixelSection>
  );
}
