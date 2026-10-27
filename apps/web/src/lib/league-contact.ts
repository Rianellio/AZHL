/**
 * Real, client-provided league contact details — NOT mock (see lib/mock/README.md; deliberately
 * outside that directory). No league-office/settings Prisma model exists yet, so this is the
 * frontend-only source of truth until one does. Fields left empty are genuinely unconfigured —
 * never filled with a placeholder/invented value. Consuming pages must treat an empty string as
 * "don't render this field," not "render a blank line."
 *
 * `mapEmbedSrc` coordinates were not invented — they came from actually resolving `mapUrl` (the
 * exact short link provided) via its HTTP redirect, which points to "Buz meydançası" (ice rink)
 * at 40.392059, 49.8241913. `mapUrl` itself is used verbatim for the click-through action.
 */
export const LEAGUE_CONTACT = {
  email: "azhlofficial@outlook.com",
  /** Not provided yet — intentionally empty, never a placeholder number. */
  phone: "",
  officeName: "Ice Palace",
  city: "Baku, Azerbaijan",
  instagramUrl: "https://www.instagram.com/azhlofficial",
  mapUrl: "https://maps.app.goo.gl/V8YaYDNfyc7UHwoNA",
  mapEmbedSrc: "https://maps.google.com/maps?q=40.392059,49.8241913&z=16&output=embed",
};
