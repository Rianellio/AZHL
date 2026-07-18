import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges class names and resolves conflicting Tailwind utility classes. Used by every shadcn-derived component. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
