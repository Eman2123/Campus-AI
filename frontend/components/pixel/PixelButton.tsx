import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "dark";
type Size = "sm" | "md" | "lg";

type Common = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

type AsLink = Common & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "className" | "children"
  >;
type AsButton = Common & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children"
  >;

export type PixelButtonProps = AsLink | AsButton;

const variants: Record<Variant, string> = {
  primary: "bg-brand-yellow text-brand-black",
  secondary: "bg-brand-white text-brand-black",
  dark: "bg-brand-black text-brand-white",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

/**
 * Hard-edged button. Press effect: hover nudges it toward its shadow (shadow
 * shrinks), active sinks it fully (shadow gone). No transitions: the jump is
 * the point.
 */
export function PixelButton(props: PixelButtonProps) {
  const { children, variant = "primary", size = "md", className } = props;

  const classes = cn(
    "pixel-focus inline-flex select-none items-center whitespace-nowrap justify-center gap-2 border-pixel border-brand-black font-pixel font-semibold leading-none shadow-pixel",
    "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-pixel-sm",
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if ("href" in props && props.href !== undefined) {
    const { href, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as AsButton;
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
