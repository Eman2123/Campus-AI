import { clsx, type ClassValue } from "clsx";

/**
 * Class-name joiner for the pixel components.
 * Deliberately plain clsx (no tailwind-merge): tailwind-merge does not know our
 * custom `border-pixel` / `shadow-pixel` utilities and would drop them.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
