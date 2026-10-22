import type { Metadata } from "next";
import { Mail, MapPin, Instagram } from "lucide-react";
import { ContactForm } from "@/components/league/contact-form";
import { LEAGUE_CONTACT } from "@/lib/league-contact";
import { T } from "@/components/ui/t";

export const metadata: Metadata = {
  title: "Contact",
};

/**
 * One container width for the whole page (max-w-7xl px-6 — same as every other AZHL page),
 * used by the intro, the contact grid, and the message section alike, so nothing on this page
 * has its own arbitrary width.
 */
export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-10 sm:pt-12">
      {/* Intro — compact, not its own tall hero section */}
      <div className="mb-10">
        <T k="contacts.title" as="h1" className="mb-2 font-display text-4xl font-bold text-foreground-primary" />
        <T k="contacts.subtitle" as="p" className="text-foreground-secondary" />
      </div>

      {/* Main grid — true 50/50 on md+, both columns top-aligned (items-start, never stretch/
          center) so the left column takes only its own natural height instead of being forced
          to the map's 500px and either centered or left half-empty. To still read as balanced
          next to a 500px map rather than looking like a short orphaned list, the column carries
          real visual weight of its own: a section label matching the map's own implicit "this is
          a map" weight, larger icon badges, and more generous inter-item rhythm — not arbitrary
          empty spacer divs. */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-start md:gap-12">
        <div className="flex flex-col gap-10">
          <T
            k="contacts.information"
            as="h2"
            className="font-display text-xs font-bold uppercase tracking-[0.2em] text-foreground-tertiary"
          />

          <div className="flex items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border-subtle text-accent">
              <Mail className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <T
                k="contacts.email"
                as="h2"
                className="font-display text-sm font-bold uppercase tracking-wide text-foreground-primary"
              />
              <a
                href={`mailto:${LEAGUE_CONTACT.email}`}
                className="mt-1.5 block text-base text-foreground-secondary transition-colors duration-150 hover:text-accent"
              >
                {LEAGUE_CONTACT.email}
              </a>
            </div>
          </div>

          {/* Phone is intentionally omitted, not blank-rendered — not provided yet
              (see lib/league-contact.ts). Add it back once a real number exists. */}

          <div className="flex items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border-subtle text-accent">
              <MapPin className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <T
                k="contacts.address"
                as="h2"
                className="font-display text-sm font-bold uppercase tracking-wide text-foreground-primary"
              />
              <p className="mt-1.5 text-base text-foreground-secondary">{LEAGUE_CONTACT.officeName}</p>
              <p className="text-base text-foreground-secondary">{LEAGUE_CONTACT.city}</p>
              <a
                href={LEAGUE_CONTACT.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-semibold uppercase tracking-wide text-accent transition-colors duration-150 hover:text-accent-hover"
              >
                <T k="contacts.openInGoogleMaps" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border-subtle text-accent">
              <Instagram className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <T
                k="contacts.socialMedia"
                as="h2"
                className="font-display text-sm font-bold uppercase tracking-wide text-foreground-primary"
              />
              <a
                href={LEAGUE_CONTACT.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-base text-foreground-secondary transition-colors duration-150 hover:text-accent"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        {/* Large map — real embedded Google Map, standard light Google colors (no filter —
            deliberately the one exception to the monochrome identity). Coordinates were resolved
            from the exact short link provided (via its HTTP redirect), never invented. The
            overlay button reuses that same exact URL for a guaranteed-correct click-through even
            though the embed itself is already interactive/pannable. */}
        <div className="relative h-[350px] w-full overflow-hidden border border-border-subtle sm:h-[420px] md:h-[500px]">
          <iframe
            src={LEAGUE_CONTACT.mapEmbedSrc}
            className="h-full w-full"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={LEAGUE_CONTACT.officeName}
          />
          <a
            href={LEAGUE_CONTACT.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 border border-border-subtle bg-surface-base/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-primary backdrop-blur-sm transition-colors duration-150 hover:border-accent hover:text-accent"
          >
            <T k="contacts.openInGoogleMaps" />
          </a>
        </div>
      </div>

      {/* Send a Message — a full section of the same page container (border-t divider, not a
          bordered floating card), centered at 70-80% of the container width rather than left-
          stuck under the grid above or shrunk to a tiny card. */}
      <div className="mt-16 border-t border-border-subtle pt-12">
        <div className="mx-auto max-w-4xl">
          <T
            k="contacts.sendMessage"
            as="h2"
            className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-foreground-primary"
          />
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
