import Image from "next/image";
import type { Partner } from "@/lib/partners";

/**
 * Real partner logo, floating directly on the page's own black background — no card, border,
 * or background box, and no leftover fringe: all three assets are genuinely alpha-keyed (not
 * just visually black-on-black by coincidence — Next's image pipeline was found to flatten
 * transparency onto white on its PNG re-encode path, so `unoptimized` serves the files
 * byte-for-byte instead of risking that). Sizing is a fixed bounding box (object-contain), not
 * a fixed height — Bellator's wordmark-only crop is much wider relative to its height than
 * Medikus or TRUE, so height-only sizing would make it read as a much bigger logo. Capping both
 * dimensions keeps the three visually consistent while still preserving each one's own aspect
 * ratio (nothing stretched).
 */
export function PartnerLogo({ partner }: { partner: Partner }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-16 w-full max-w-[180px] items-center justify-center">
        <Image
          src={partner.logoSrc}
          alt={partner.name}
          width={partner.logoWidth}
          height={partner.logoHeight}
          unoptimized
          className="h-full w-full object-contain"
        />
      </div>
      <span className="text-center text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
        {partner.name}
      </span>
    </div>
  );
}
