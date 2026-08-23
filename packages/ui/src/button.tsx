import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@azhl/utils";

/**
 * The pattern example for cross-app promotion: this Button is the shape every future
 * packages/ui primitive should follow (cva variants, Slot for asChild, tokens via
 * Tailwind classes rather than hardcoded values). See ../README.md before adding a second.
 * Token names match .claude/design-system.md exactly.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium " +
    "transition-[color,background-color,border-color,transform] duration-150 ease-out " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base active:scale-[0.97] " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-tint hover:bg-accent-hover active:bg-accent-hover",
        secondary:
          "bg-surface-raised text-foreground-primary hover:bg-surface-hover active:bg-surface-hover border border-border-subtle",
        ghost: "text-foreground-primary hover:bg-surface-hover active:bg-surface-hover",
        // Not yet used by any Phase 1 page — flag for a contrast re-check by UI/UX Architect before first real use.
        live: "bg-live text-accent-tint hover:bg-live/90 active:bg-live/90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
