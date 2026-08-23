/**
 * Official crest assets (apps/web/public/logos/*) — real, client-provided. The source files
 * were flat JPEGs with a white or black background baked in (no alpha channel); each was
 * processed once (flood-fill background removal from the image border, preserving any
 * same-colored details fully enclosed inside the mark) into a real transparent PNG. See
 * TeamLogo — it renders these with no background container, directly on the page.
 * Keyed by team slug.
 */
export const TEAM_LOGO_SRC: Record<string, string> = {
  qartal: "/logos/qartal.png",
  ulduz: "/logos/ulduz.png",
  gala: "/logos/gala.png",
  buta: "/logos/buta.png",
};
