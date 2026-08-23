# lib/mock — frontend-only placeholder data

Everything in this directory is **mock data with no backing Prisma model**, used only because
the approved AZHL mockups show UI sections (player stats, play-by-play, lineups, penalties,
three stars, media, partners, coach/founded info, news categories) that the current schema
doesn't support yet.

Rules enforced here:
- Never imported by `lib/server/services/*` or any `app/api/**` route — those stay 100% real.
- Deterministic — every generator is seeded from a real, stable ID (player id, game id, team
  slug), never `Math.random()` on every call, so server and client render the same values and
  the same page looks the same on every visit (no hydration mismatches, no data that "shifts").
- A later roadmap phase (see `.claude/roadmap.md`) replaces each of these with a real Prisma
  model + service; when that happens, the consuming component's props shouldn't need to
  change — only the data source swaps.
