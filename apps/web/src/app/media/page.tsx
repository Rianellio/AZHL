import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import Image from "next/image";
import { Instagram } from "lucide-react";
import { Button } from "@azhl/ui";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/t";
import { LEAGUE_CONTACT } from "@/lib/league-contact";

export const metadata: Metadata = {
  title: serverT("meta.media"),
};

/**
 * AZHL has exactly one official media channel today (Instagram) — this page states that plainly
 * rather than padding it out with invented platforms, fake posts, or fake follower/engagement
 * stats. Reuses `LEAGUE_CONTACT.instagramUrl` (the same verified handle/link the Contacts page
 * uses) instead of a second hardcoded copy of the URL, so there is exactly one source of truth
 * for it in the codebase.
 */
export default function MediaPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <T
          k="media.title"
          as="h1"
          className="font-display text-4xl font-bold uppercase tracking-wide text-foreground-primary sm:text-5xl"
        />
        <T
          k="media.subtitle"
          as="p"
          className="font-display text-lg font-semibold uppercase tracking-wide text-foreground-secondary"
        />
        <T k="media.description" as="p" className="text-sm leading-relaxed text-foreground-secondary sm:text-base" />
      </div>

      <div className="mx-auto mt-12 w-full max-w-md sm:mt-16">
        <Card className="transition-colors duration-300 hover:border-accent">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-10">
            {/* The actual @azerbaijan.icehockey Instagram avatar — NOT the AZHL website logo.
                Resolved once from the account's own og:image and saved locally as a dedicated
                asset (public/media/instagram-profile.jpg) rather than the site's brand mark,
                per the explicit "must be the real profile photo, not a substitute" requirement.
                Unmodified pixels — only a CSS circular crop/frame is applied here. */}
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-overlay">
              <Image
                src="/media/instagram-profile.jpg"
                alt="AZHL Instagram profile picture"
                width={150}
                height={150}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="flex items-center justify-center gap-1.5 font-display text-lg font-bold uppercase tracking-wide text-foreground-primary">
                <Instagram className="h-4 w-4 text-foreground-secondary" strokeWidth={1.75} aria-hidden="true" />
                Instagram
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">@azerbaijan.icehockey</p>
            </div>
            <Button asChild size="lg" className="w-full rounded-sm">
              <a href={LEAGUE_CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer">
                <T k="media.followButton" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
