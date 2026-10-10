import { cn } from "@/lib/cn";
import { PixelBadge } from "./PixelBadge";

/** Eyebrow badge + pixel-font title + Work Sans description. Pixel font stays in the title only. */
export function PixelSectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && <PixelBadge tone="black" className="mb-4">{eyebrow}</PixelBadge>}
      <h2 className="font-pixel text-3xl font-bold leading-tight sm:text-5xl">{title}</h2>
      {description && (
        <p className="mt-4 font-sans text-base leading-relaxed sm:text-lg">{description}</p>
      )}
    </div>
  );
}
