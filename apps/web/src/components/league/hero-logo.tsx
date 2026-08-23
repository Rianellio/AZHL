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
    <div className="relative flex w-full items-center justify-center">
      <Image
        src="/brand/azhl-logo.png"
        alt=""
        width={1124}
        height={798}
        priority
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-contain opacity-40 blur-2xl"
      />
      <Image
        src="/brand/azhl-logo.png"
        alt="AZHL — Azerbaijan Hockey League"
        width={1124}
        height={798}
        priority
        className="relative h-auto w-full object-contain drop-shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
      />
    </div>
  );
}
