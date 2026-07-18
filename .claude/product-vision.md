# Product Vision

## What AZHL is

AZHL is a premium hockey league platform: the digital home for a league's standings, schedules,
game centers, news, teams, players, stats, and — eventually — the fan-facing commerce and media
experiences that surround a professional sports league. It is built as a real, production-grade
ecosystem from the start (public web app, admin panel, mobile API, shared packages) rather than
a single monolithic site, because the product is expected to outlive its first feature set.

## Who it's for

- **Fans** — following standings, schedules, live-ish game state, and news; the primary
  audience for `apps/web` through Phase 3.
- **League operations / admins** — managing teams, rosters, schedules, and content; served by
  `apps/admin` starting Phase 4.
- **Third-party and mobile clients** — consuming a stable, versioned API; served by
  `apps/mobile-api` in the Future phase, using the same contract `apps/web`'s `app/api/v1/*`
  establishes today.

## Aesthetic and experiential pillars

AZHL sits in the visual and experiential territory of **NHL.com, Formula1.com, Apple, Linear,
and Vercel** — but it is **not a copy of any of them**. It borrows a sensibility, not a
template:

- **Dark by default** — near-black base surfaces; light is used deliberately, not by default.
- **Minimal** — generous whitespace, restrained UI chrome, content and data given room to
  breathe rather than boxed in.
- **Large type** — display type does real work; headlines and key numbers (scores, standings)
  are typographically confident, not squeezed into small UI type.
- **Cinematic motion** — animation used to establish hierarchy and continuity (page transitions,
  data reveals), never as decoration; see [animation-guidelines.md](./animation-guidelines.md).
- **High contrast** — WCAG AA everywhere, no reliance on subtle gray-on-gray distinctions for
  meaning.
- **Fast** — perceived and real performance is a feature; ISR, RSC-first rendering, and a
  performance budget on animation all serve this pillar directly.

The full visual language (palette, type scale, spacing, motion tokens) is specified in
[design-system.md](./design-system.md); this document only states the intent that system
implements.

## Long-term feature list, by phase

See [roadmap.md](./roadmap.md) for prerequisites and agent ownership per phase. Feature list:

- **Phase 0 — Foundation.** Monorepo, infra scaffold, shared packages, `.claude` knowledge base.
  No end-user features.
- **Phase 1 — League Hub (`apps/web`).** Home, standings, schedule, game center (box score),
  news list + detail.
- **Phase 2 — Teams & Players.** Team pages, rosters, player profiles.
- **Phase 3 — Stats & History.** Stats center, playoffs bracket/coverage, awards, league
  history.
- **Phase 4 — Accounts.** Auth, player/team dashboards, `apps/admin` becomes a real, working
  admin panel (content and roster management).
- **Phase 5 — Discovery & Media.** Search, notifications, photo gallery, video highlights,
  sponsor placements, Cloudinary goes live for real media handling.
- **Future.** `apps/mobile-api` becomes real, ticketing, merchandise/shop, live streaming,
  Vercel and GitHub remotes go live for real deployment and collaboration. See
  [future-services.md](./future-services.md) for architectural detail on this phase.

## Non-goals for the current phase

The current pass covers **Phase 0 (foundation) and Phase 1 (League Hub)** only. Explicitly out
of scope right now, even though they're on the long-term list above:

- Team pages, rosters, or player profiles beyond the minimal `Player` model needed for game
  center box scores (Phase 2).
- Stats center, playoffs, awards, or league history views (Phase 3).
- Any authentication, login, or dashboard UI — Auth.js is scaffolded but not wired to real
  protected routes or user-facing flows (Phase 4).
- Real logic in `apps/admin` or `apps/mobile-api` beyond a bootable scaffold + README (Phase 4 /
  Future).
- Search, notifications, photo gallery, video, sponsor placements, or any live Cloudinary
  integration (Phase 5).
- Ticketing, shop, live streaming, or any live Vercel/GitHub remote (Future).
- Promoting components into `packages/ui` speculatively — it stays a scaffold with one example
  primitive until a second app actually consumes it (see
  [engineering-principles.md](./engineering-principles.md)).

If a task in this pass seems to require reaching into one of the above, treat that as a signal
to stop and flag it against [roadmap.md](./roadmap.md) rather than building ahead.
