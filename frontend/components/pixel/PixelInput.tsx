import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type PixelInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Small helper text under the field. */
  hint?: string;
  /** Error text under the field; also marks the input invalid. */
  error?: string | null;
  /** A control that sits inside the field on the right (e.g. a show/hide button). */
  action?: ReactNode;
  /** Something on the label row, right-aligned (e.g. a "Forgot password?" link). */
  labelAside?: ReactNode;
};

/**
 * Labelled text field in the pixel style: 3px black border, flat, no
 * rounded corners. Always renders a real <label>; the optional hint and
 * error are tied to the input with aria-describedby.
 */
export const PixelInput = forwardRef<HTMLInputElement, PixelInputProps>(function PixelInput(
  { label, hint, error, action, labelAside, className, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-pixel text-sm font-semibold">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "pixel-focus h-12 w-full border-pixel border-brand-black bg-brand-white px-3.5 font-sans text-base text-brand-black placeholder:text-brand-black/50",
            action ? "pr-20" : "",
            error ? "bg-[#FFF1F2]" : "",
            className,
          )}
          {...rest}
        />
        {action && <div className="absolute inset-y-0 right-1.5 flex items-center">{action}</div>}
      </div>
      {error && (
        <p id={errorId} className="font-sans text-sm font-semibold text-noteDark-coral">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="font-sans text-sm text-muted-onPaper">
          {hint}
        </p>
      )}
    </div>
  );
});
