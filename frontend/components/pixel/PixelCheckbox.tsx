import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type PixelCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "children"> & {
  children: ReactNode;
};

/** Native checkbox (so keyboard and screen readers just work), sized and tinted for the pixel look. */
export function PixelCheckbox({ children, className, ...rest }: PixelCheckboxProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        type="checkbox"
        className={cn("pixel-focus h-5 w-5 shrink-0 cursor-pointer accent-brand-black", className)}
        {...rest}
      />
      <label htmlFor={id} className="cursor-pointer select-none font-sans text-sm">
        {children}
      </label>
    </div>
  );
}
