import Image from "next/image";

/**
 * Official AZHL patch/badge logo — the hero's focal point (see hero-visual.tsx, which sizes and
 * parallax-drives this component's wrapper but never touches its contents, and Logo, the shared
 * component every other placement uses — see components/ui/logo.tsx). Source is a photographed
 * embroidered patch with its flat photo backdrop keyed out to real alpha transparency, so only
 * the patch's own silhouette (rounded-rect body, its own stitched border, wordmark, stripes —
 * none of it altered) is opaque; no surrounding rectangular canvas to read as a "frame". The
 * blurred duplicate behind it still reads as a soft glow, since blurring diffuses the patch's
 * white border/lettering outward — matching the same bloom treatment used elsewhere in the hero
 * (see hero-visual.tsx's own bloom layer).
 */
export function HeroLogo() {
  return (
    <div className="relative flex w-full items-center justify-center py-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-72 w-72 rounded-full bg-[#2F8FFF]/20 blur-[110px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-44 w-44 rounded-full bg-cyan-400/25 blur-[65px]"
      />

      <Image
        src="/brand/azhl-logo.webp"
        alt="AZHL — Azerbaijan Hockey League"
        width={1124}
        height={798}
        priority
        className="relative z-10 h-auto w-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(47,143,255,0.25)]"
      />
    </div>
  );
}