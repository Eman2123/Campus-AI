import Image from "next/image";
import { PixelBadge, PixelCard, PixelSection, PixelSectionHeading } from "@/components/pixel";
import { ASSETS } from "@/lib/assets";
import { Reveal } from "./Reveal";

/** Section 8: soft yellow. Two equal cards. File facts match backend/app/core/storage.py. */
export function VoiceDocs() {
  const mic = ASSETS.docs.mic;
  const pdf = ASSETS.docs.pdf;

  return (
    <PixelSection bg="soft" id="voice-docs">
      <PixelSectionHeading
        eyebrow="Your way of studying"
        title="Talk to it. Feed it your files."
        align="center"
      />
      <div className="mt-14 grid gap-8 md:grid-cols-2">
        <Reveal className="h-full">
          <PixelCard className="flex h-full flex-col items-start">
            <Image src={mic.src} width={mic.width} height={mic.height} alt="" sizes="(min-width: 768px) 220px, 60vw" className="mx-auto h-44 w-auto" />
            <PixelBadge tone="sky" className="mt-5">Voice</PixelBadge>
            <h3 className="mt-3 font-pixel text-2xl font-bold">Say it instead of typing</h3>
            <p className="mt-2 font-sans text-sm leading-relaxed">
              Hit the mic, ask your question out loud, and get the same specialist answer you would
              get by typing it. Handy when your hands are full of highlighters.
            </p>
          </PixelCard>
        </Reveal>
        <Reveal className="h-full" delay={120}>
          <PixelCard className="flex h-full flex-col items-start">
            <Image src={pdf.src} width={pdf.width} height={pdf.height} alt="" sizes="(min-width: 768px) 220px, 60vw" className="mx-auto h-44 w-auto" />
            <PixelBadge tone="mint" className="mt-5">Documents</PixelBadge>
            <h3 className="mt-3 font-pixel text-2xl font-bold">Answers from your own material</h3>
            <p className="mt-2 font-sans text-sm leading-relaxed">
              Upload PDFs, Word files, or plain text and Markdown notes, up to 20 MB each. Campus AI
              searches what you gave it, so answers match your course instead of the open web.
            </p>
          </PixelCard>
        </Reveal>
      </div>
    </PixelSection>
  );
}
