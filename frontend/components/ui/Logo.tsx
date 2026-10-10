import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** Rendered height in px; width follows the logo's aspect ratio (931:241). */
  height?: number;
  /** Link target. Pass `null` to render a plain image with no link. */
  href?: string | null;
  className?: string;
};

const RATIO = 931 / 241;

export function Logo({ height = 40, href = "/", className = "" }: LogoProps) {
  const image = (
    <Image
      src="/campus-ai-logo.png"
      alt="Campus AI"
      width={Math.round(height * RATIO)}
      height={height}
      priority
      className={className}
    />
  );

  if (href === null) return image;

  return (
    <Link href={href} aria-label="Campus AI home" className="inline-flex">
      {image}
    </Link>
  );
}
