/**
 * Real, client-provided partner data — NOT mock (see lib/mock/README.md; this file is
 * deliberately outside that directory). No Sponsor/Partner Prisma model exists yet, so this is
 * the frontend-only source of truth until one does; PartnersStrip consumes it exactly like it
 * would a future service call, so swapping this array for a real query later is a source swap,
 * not a component change. Logo assets are the exact files provided — no artwork pixels touched,
 * only alpha-keyed to remove each source image's own flat backdrop (see
 * apps/web/public/partners/); dimensions below are each file's real post-keying size.
 */
export interface Partner {
  name: string;
  logoSrc: string;
  logoWidth: number;
  logoHeight: number;
}

export const PARTNERS: Partner[] = [
  { name: "Medikus Clinic", logoSrc: "/partners/medikus-clinic.png", logoWidth: 405, logoHeight: 126 },
  { name: "TRUE", logoSrc: "/partners/true.png", logoWidth: 1284, logoHeight: 655 },
  { name: "Bellator", logoSrc: "/partners/bellator.png", logoWidth: 1688, logoHeight: 402 },
];
