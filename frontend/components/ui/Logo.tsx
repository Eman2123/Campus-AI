import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** Rendered height in px; width follows the chosen logo's aspect ratio. */
  height?: number;
  /**
   * "default" has dark "Campus" lettering (for white / yellow / paper
   * backgrounds). "onDark" has white lettering (for black or dark-theme
   * backgrounds) and needs no white plate behind it.
   */
  variant?: "default" | "onDark";
  /** Link target. Pass `null` to render a plain image with no link. */
  href?: string | null;
  className?: string;
};

const SOURCES = {
  default: { src: "/campus-ai-logo.png", ratio: 931 / 241, unoptimized: false },
  // SVG: already tiny and crisp at any size, so next/image's optimizer is skipped.
  onDark: { src: "/campus-ai-logo-dark.svg", ratio: 972 / 212, unoptimized: true },
} as const;

export function Logo({ height = 40, variant = "default", href = "/", className = "" }: LogoProps) {
  const { src, ratio, unoptimized } = SOURCES[variant];
  const image = (
    <Image
      src={src}
      alt="Campus AI"
      width={Math.round(height * ratio)}
      height={height}
      priority
      unoptimized={unoptimized}
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
