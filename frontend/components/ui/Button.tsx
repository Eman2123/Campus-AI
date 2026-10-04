import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
};

export function Button({ href, children, variant = "primary" }: ButtonProps) {
  const base =
    "inline-flex items-center rounded-sm px-6 py-3 font-sans text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-highlighter text-ink hover:bg-[#f7c563]"
      : "border border-paper/30 text-paper hover:border-paper/60";

  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}
