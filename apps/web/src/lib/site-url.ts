/** Absolute origin of the public site — used for metadataBase, sitemap and robots. Set
 * NEXT_PUBLIC_SITE_URL in each deployed environment; localhost is only the dev fallback. */
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
