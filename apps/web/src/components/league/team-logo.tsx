import Image from "next/image";
import { TEAM_LOGO_SRC } from "@/lib/team-logos";
import { cn } from "@/lib/utils";

export interface TeamLogoProps {
  teamSlug: string;
  teamName: string;
  size?: number;
  className?: string;
}

/**
 * Renders the official crest directly on the page — no background plaque, no box. All 4 real
 * crests are genuine transparent PNGs (background flood-filled out, see lib/team-logos.ts),
 * so they sit naturally on the dark UI. Falls back to nothing if a slug has no mapped asset.
 */
export function TeamLogo({ teamSlug, teamName, size = 96, className }: TeamLogoProps) {
  const src = TEAM_LOGO_SRC[teamSlug];
  if (!src) return null;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <Image src={src} alt={`${teamName} crest`} fill sizes={`${size}px`} className="object-contain" />
    </div>
  );
}
