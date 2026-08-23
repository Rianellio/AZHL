import { PARTNERS } from "@/lib/partners";
import { PartnerLogo } from "./partner-logo";

/**
 * Exactly 3 real partners in a fixed, symmetric 3-column grid — not a horizontal scroller. The
 * previous version was a scroll-with-arrows strip built for an open-ended list; with a fixed
 * count that always fits, the scroll affordance was dead UI (nothing to scroll to) and read as
 * loose/unbalanced. CSS grid's `minmax(0, 1fr)` columns (Tailwind's `grid-cols-3`) guarantee all
 * three stay equal width and shrink together at any viewport instead of overflowing, so this
 * needs no separate mobile breakpoint to avoid horizontal scroll.
 */
export function PartnersStrip() {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-3 items-start gap-4 sm:gap-10">
      {PARTNERS.map((partner) => (
        <PartnerLogo key={partner.name} partner={partner} />
      ))}
    </div>
  );
}
