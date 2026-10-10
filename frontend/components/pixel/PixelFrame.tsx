import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Retro window frame: title bar with three square controls. Used to wrap the
 * chat demo and any "screenshot-like" content on a yellow section.
 */
export function PixelFrame({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-pixel border-brand-black bg-brand-white text-brand-black shadow-pixel-lg",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b-pixel border-brand-black bg-brand-yellow px-3 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 border-2 border-brand-black bg-brand-white" />
          <span className="h-3 w-3 border-2 border-brand-black bg-brand-white" />
          <span className="h-3 w-3 border-2 border-brand-black bg-brand-black" />
        </div>
        {title && (
          <span className="font-pixel text-sm font-semibold leading-none">{title}</span>
        )}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
