import * as React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImagePlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind aspect-ratio class, e.g. "aspect-[16/9]" — must match the real asset's future crop. */
  ratio: string;
  icon?: React.ReactNode;
}

/**
 * Stand-in for real photography (hero backgrounds, player/team photos, media thumbnails).
 * Exposes the same box (aspect ratio + fill behavior) a future next/image would occupy, so
 * dropping in a real asset later is a source swap, not a layout change. See .claude/roadmap.md
 * for when real media assets land (Phase 5 — media/gallery).
 */
export function ImagePlaceholder({ ratio, icon, className, ...props }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-surface-overlay via-surface-raised to-surface-base",
        ratio,
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),transparent_60%)]" />
      {icon ?? <ImageIcon className="relative h-8 w-8 text-foreground-tertiary" strokeWidth={1.25} />}
    </div>
  );
}
