import Image from "next/image";
import { cn } from "@/lib/utils";

/** Real intrinsic dimensions of /public/brand/azhl-logo.png — used so the browser can size
 * width automatically from a height-only Tailwind class without distorting the image. */
const LOGO_WIDTH = 1124;
const LOGO_HEIGHT = 798;

export interface LogoProps {
  /** Sizing is height-driven — pass a height utility (e.g. "h-10"); width follows the logo's
   * real aspect ratio automatically via the image's intrinsic width/height. */
  className?: string;
  priority?: boolean;
}

/**
 * The single reusable placement for the official AZHL brand mark — every non-hero usage (nav,
 * mobile nav, footer) renders this component rather than re-implementing the `<Image>` call, so
 * there is exactly one place that knows the asset's path, alt text, and real aspect ratio. The
 * hero has its own variant (hero-logo.tsx) with a bloom/parallax treatment this component
 * intentionally doesn't carry — everywhere else just needs the mark itself, sharply rendered at
 * whatever height the placement calls for.
 */
export function Logo({ className, priority = false }: LogoProps) {
  return (
    <Image
      src="/brand/azhl-logo.png"
      alt="AZHL — Azerbaijan Hockey League"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn("w-auto object-contain", className)}
    />
  );
}
