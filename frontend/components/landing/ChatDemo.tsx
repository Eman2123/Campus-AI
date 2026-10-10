import { PixelSection, PixelSectionHeading } from "@/components/pixel";
import { ChatDemoWidget } from "./ChatDemoWidget";
import { Reveal } from "./Reveal";

/** Section 6: yellow. Real-looking chat UI in a pixel window. */
export function ChatDemo() {
  return (
    <PixelSection bg="yellow" id="demo">
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <PixelSectionHeading
            eyebrow="See it in action"
            title="Just ask. It answers from your notes."
            description="Attach your notes, say what you need, and the right specialist picks it up. This is an example conversation."
          />
        </Reveal>
        <ChatDemoWidget />
      </div>
    </PixelSection>
  );
}
