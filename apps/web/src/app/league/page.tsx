import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/server";
import Link from "next/link";
import { Users, CalendarDays, Swords, Crown, Trophy, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@azhl/ui";
import { getAllTeams } from "@/lib/server/services/team.service";
import { Hero } from "@/components/league/hero";
import { SectionHeader } from "@/components/league/section-header";
import { TeamLogo } from "@/components/league/team-logo";
import { PartnersStrip } from "@/components/league/partners-strip";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/t";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: serverT("meta.league"),
};

/** Structural description of how AZHL competition works — no results or history implied, just the format. */
const COMPETITION_FORMAT: { icon: typeof Users; titleKey: TranslationKey; descriptionKey: TranslationKey }[] = [
  { icon: Users, titleKey: "league.format4Teams", descriptionKey: "league.format4TeamsDesc" },
  { icon: CalendarDays, titleKey: "league.formatRegularSeason", descriptionKey: "league.formatRegularSeasonDesc" },
  { icon: Swords, titleKey: "league.formatPlayoffs", descriptionKey: "league.formatPlayoffsDesc" },
  { icon: Crown, titleKey: "league.formatFinal", descriptionKey: "league.formatFinalDesc" },
];

export default async function LeaguePage() {
  const teams = await getAllTeams();

  return (
    <div className="flex flex-col">
      <Hero eyebrowKey="league.heroEyebrow" titleKey="league.heroTitle" taglineKey="league.heroTagline" />

      {/* About AZHL — exact provided English copy, translated for AZ/RU, no invented history or achievements */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <SectionHeader titleKey="league.aboutTitle" />
        <div className="flex max-w-3xl flex-col gap-4 text-base leading-relaxed text-foreground-secondary">
          <p>
            <T k="league.aboutP1" />
          </p>
          <p>
            <T k="league.aboutP2" />
          </p>
          <p>
            <T k="league.aboutP3" />
          </p>
        </div>
      </section>

      {/* Competition Format */}
      <section className="border-t border-border-subtle bg-surface-raised/40">
        <div className="mx-auto w-full max-w-7xl px-6 py-16">
          <SectionHeader titleKey="league.competitionFormat" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COMPETITION_FORMAT.map(({ icon: Icon, titleKey, descriptionKey }, index) => (
              <Card
                key={titleKey}
                className="group opacity-0 transition-all duration-300 ease-out [animation:fade-in-up_0.6s_ease-out_both] hover:-translate-y-1 hover:border-accent"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border-subtle bg-surface-overlay text-accent transition-colors duration-300 group-hover:border-accent">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <T
                    k={titleKey}
                    as="h3"
                    className="font-display text-lg font-bold uppercase tracking-wide text-foreground-primary"
                  />
                  <T
                    k={descriptionKey}
                    as="p"
                    className="text-sm leading-relaxed text-foreground-secondary"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Teams Overview */}
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <SectionHeader titleKey="league.teamsOverview" action={{ labelKey: "league.viewAllTeams", href: "/teams" }} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team, index) => (
            <Link key={team.id} href={`/teams/${team.slug}`} className="block">
              <Card
                className="flex h-full flex-col items-center opacity-0 transition-all duration-300 ease-out [animation:fade-in-up_0.6s_ease-out_both] hover:-translate-y-1 hover:border-accent"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <TeamLogo teamSlug={team.slug} teamName={team.name} size={88} />
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide text-foreground-primary">
                    {team.name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Championship Trophy */}
      <section className="border-t border-border-subtle bg-surface-raised/40">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border-strong text-foreground-tertiary">
            <Trophy className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <T
            k="league.championshipTrophy"
            as="h2"
            className="font-display text-2xl font-bold uppercase tracking-wide text-foreground-primary"
          />
          <T
            k="league.comingSoon"
            as="p"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-accent"
          />
          <T
            k="league.trophyBlurb"
            as="p"
            className="max-w-md text-sm leading-relaxed text-foreground-secondary"
          />
        </div>
      </section>

      {/* Official Regulations Section */}
      <section id="regulations" className="border-t border-border-subtle bg-surface-base py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="flex flex-col gap-2">
            <T
              k="league.regulationsEyebrow"
              as="p"
              className="text-xs font-bold uppercase tracking-wider text-accent"
            />
            <T
              k="league.regulationsTitle"
              as="h2"
              className="font-display text-3xl font-extrabold uppercase text-foreground-primary sm:text-4xl"
            />
            <T
              k="league.regulationsDesc"
              as="p"
              className="max-w-2xl text-sm text-foreground-secondary"
            />
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-lg border border-border-subtle bg-surface-raised/50 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-overlay text-accent">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-0.5">
                <T
                  k="league.regulationsDocTitle"
                  as="h3"
                  className="font-semibold text-foreground-primary"
                />
                <T
                  k="league.regulationsDocMeta"
                  as="p"
                  className="text-xs text-foreground-tertiary"
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild variant="secondary" size="sm">
                <a
                  href="/documents/azhl-reqlament-2026-2027.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span><T k="league.viewPdf" /></span>
                </a>
              </Button>
              <Button asChild size="sm">
                <a
                  href="/documents/azhl-reqlament-2026-2027.pdf"
                  download="AZHL_Reqlament_2026_2027.pdf"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span><T k="league.downloadPdf" /></span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="border-t border-border-subtle mx-auto w-full max-w-7xl scroll-mt-24 px-6 py-16">
        <SectionHeader titleKey="home.partners" />
        <PartnersStrip />
      </section>
    </div>
  );
}