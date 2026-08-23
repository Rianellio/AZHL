# PROJECT_HISTORY.md — AZHL Engineering Log

A chronological record of how AZHL was actually built, reconstructed from git history and file
modification timestamps (git commit metadata for committed work; filesystem mtimes for the
substantial uncommitted body of work that follows it — noted explicitly per entry). This is an
engineering log, not a narrative summary: each entry states what changed, why, and what it
established for later work. For the *current* state this history led to, see
[PROJECT_STATE.md](./PROJECT_STATE.md). For the reasoning behind any specific decision named
below, see its ADR in [DECISIONS.md](./DECISIONS.md).

---

## 2026-07-18 — Foundation and Phase 1 League Hub

**Commit `baf42c0`** (23:40:44 +0400) — `feat(repo): scaffold AZHL foundation and Phase 1 League Hub`.
133 files, +9,925 lines. Single largest commit in the project's history; established nearly
everything real that exists today.

What this commit established:
- The pnpm + Turborepo monorepo shape (ADR-001): `apps/{web,admin,mobile-api}`,
  `packages/{database,types,utils,ui,config}`.
- The full `.claude/` knowledge base as it existed at Phase 0/1 completion — 16 documents plus 12
  agent definitions, establishing the documentation-first operating model
  ([PROJECT_RULES.md](./PROJECT_RULES.md) R-001) from the very first commit.
- The services→RSC/API pattern (ADR-002) and its first real implementations: `standings.service.ts`,
  `schedule.service.ts`, `news.service.ts`, each paired with a thin `app/api/v1/*` route handler.
- Phase 1's real Prisma schema: `League`, `Season`, `Team`, `Player` (minimal shape), `Game`,
  `Standing` (derived), `NewsArticle` — plus the first migration and an idempotent seed script
  (ADR-105).
- Phase 1's frontend: Home, Standings, Schedule, Game Center, News list + detail, `Shell`/`Nav`/
  `Footer`, and the initial `league/`, `layout/`, `ui/` component tiers.
- Tooling: Husky + commitlint (ADR-801), `.github/workflows/ci.yml` (unused, no remote — ADR-006),
  `docker-compose.yml` for local Postgres.

This is the commit every later ADR in `0xx`–`2xx` and `7xx` traces back to as its point of origin.

---

## 2026-07-19 — Environment and tooling fix

**Commit `bc2f2dc`** (03:09:54 +0400) — `fix(repo): resolve Prisma env-loading and eslint next-env.d.ts failures`.
5 files, +21/−35.

Root-caused during a full re-verification pass (build/lint/typecheck/dev server confirmed clean on
entirely fresh caches) that began roughly three hours after `baf42c0` — the `.env`/README
modification timestamp (00:56) through the commit (03:09) brackets this session. Two independent
bugs, both fixed here:

1. Prisma and Next.js each auto-load `.env` from their **own package directory**, not the monorepo
   root — a root-only `.env` silently never reached either tool outside a manually-sourced shell.
   Fixed by moving real (gitignored) env files to `apps/web/.env` and `packages/database/.env`,
   with the root `.env.example` demoted to documentation-only (ADR-802).
2. `eslint-plugin-next`'s shared config never excluded the Next.js-generated `next-env.d.ts`,
   which legitimately uses triple-slash references and fails
   `@typescript-eslint/triple-slash-reference` once it exists after a first build — fixed centrally
   in `packages/config/eslint/nextjs.js` (ADR-803).

A secondary consequence of fix #1: the `dotenv-cli` wrapper was dropped from
`packages/database`'s Prisma scripts, since it would additionally have broken on Vercel/CI, where
no `.env` file exists at all and env vars come from the platform directly.

**This is the last point at which the full stack (build, lint, typecheck, dev server) was
confirmed clean end-to-end** — see [KNOWN_ISSUES.md AZ-I3](./KNOWN_ISSUES.md) for why this matters
against the substantial uncommitted work that follows.

---

## 2026-07-24 through 2026-07-28 — Frontend expansion into Phase 2/3 territory (uncommitted)

No commits exist for this five-day span — every file below remains in the working tree,
reconstructed from filesystem modification timestamps. This is the single largest body of
unrecorded engineering work in the project.

### 2026-07-24 — Mock-data infrastructure, hero section, first Phase 2 services
The session that began this expansion first solved a real design problem: the approved AZHL
mockups included UI sections (player stats, team news, partners) with no backing Prisma model.
Rather than blocking on a schema that was out of scope for the current roadmap phase, the decision
was made (ADR-706) to build `apps/web/src/lib/mock/*` — deterministic, ID-seeded placeholder data,
explicitly firewalled from ever being imported by `lib/server/services/*` or `app/api/**`
([PROJECT_RULES.md](./PROJECT_RULES.md) R-104/R-105). `mock/README.md`, `mock/seed-hash.ts`
(the seeding utility every later generator depends on), and `mock/partners.ts` were the first
three files, immediately followed by the first *real* Phase 2 service work:
`player.service.ts` and `team.service.ts` — both genuine Prisma-backed services, not mock,
established the same session. The `hero.tsx`/`hero-visual.tsx` components and the first
`players/page.tsx` were also built this day.

### 2026-07-25 — Teams directory page
`teams/page.tsx` — the team-listing page, consuming `team.service.ts` from the day before.

### 2026-07-26 — Team detail, player detail, and their supporting components
The largest single day of this expansion. Real team-brand-logo assets (`buta.png`, `gala.png`,
`qartal.png`, `ulduz.png`) were added, alongside `team-logos.ts` (a lookup helper) and
`team-logo.tsx`. `teams/[slug]/page.tsx` (team detail) and `players/[id]/page.tsx` (player
profile — the largest new page at 223 lines) were both built, backed by a combination of real data
(`team.service.ts`/`player.service.ts`) and new mock generators for sections the schema still
doesn't support (`player-bio.ts`, `player-stats.ts`, `rink-positions.ts`). Supporting components:
`rink-roster.tsx`, `full-squad.tsx`, `player-card.tsx`, `top-player-row.tsx`,
`team-select-panel.tsx`, `standings-widget.tsx`, `next-game-row.tsx`, and `position-labels.ts`.
`packages/database/prisma/seed.ts` was substantially reworked this day too (the tracked-file
modification most likely backfilling richer data to support the new pages).

### 2026-07-27 — Brand identity
`apps/web/public/brand/azhl-logo.png` (the league's own logo, distinct from team logos) and
`hero-logo.tsx` — the smallest day of this span, focused on brand asset integration.

### 2026-07-28 — League page, schedule calendar, stats page, contacts page
The final day of this expansion, closing out four more Phase 2/3-adjacent surfaces in one session:
`league/page.tsx`, `schedule-calendar.tsx` (a richer schedule view than Phase 1's `ScheduleList`),
`stats/page.tsx` with `stat-leaderboard-card.tsx` and a new `goalie-stats.ts` mock generator, and
`contacts/page.tsx` with `contact-form.tsx` and a `league-contact.ts` mock generator. This same
day, the Phase 1 surfaces most directly affected by the week's restyling work were touched for the
last time before this document's creation: `globals.css`, `schedule/page.tsx`,
`standings/page.tsx`, `schedule-list.tsx`, `score-card.tsx`, `standings-table.tsx`.

**Net effect of this five-day span:** `/teams`, `/teams/[slug]`, `/players`, `/players/[id]`,
`/stats`, `/league`, `/contacts` — seven pages that, per `roadmap.md` as written, belong to Phase
2/3 — were built substantially ahead of their documented phase gate. See
[KNOWN_ISSUES.md AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase)
for the resulting process-integrity issue this creates, and
[IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) §3–§4 for how Phase 2/3 are now redefined in
terms of *remaining* (mock-data-replacement) work rather than from-scratch work.

---

## 2026-07-29 — The design-only backend architecture series and its security review (uncommitted)

A single continuous session (15:57 through 22:55, over 7 hours) produced eight large architecture
documents plus an independent security review of them — the second-largest body of unrecorded work
in the project, and the one that most changed the *shape* of AZHL's documented (if not yet built)
future.

**Why this session happened:** `.claude/architecture.md` (from `baf42c0`) established the Phase
0/1 stack and the services→RSC/API pattern, but said nothing about how the backend should evolve
once Phase 4/5 add real write paths, auth, media, and notifications at scale. This session filled
that gap — entirely as forward-looking design, explicitly marked "nothing in this file is
implemented" in every document's own header, consistent with the project's established pattern of
writing down intent before building it (the same pattern `future-services.md` and `erd.md`'s
"Future — not yet migrated" section already used at smaller scale in `baf42c0`).

Order of authorship (by file mtime), each building directly on the one before it:

1. **15:57 — `backend-architecture.md`.** The foundational document: nine business modules, the
   modular-monolith-to-Kafka Stage 1/2/3 evolution (ADR-203), the four communication rules
   ([PROJECT_RULES.md](./PROJECT_RULES.md) R-201–R-203), and first sketches of Redis usage,
   BullMQ, auth, RBAC, logging, error handling, and validation that every later document in this
   series extends rather than re-derives.
2. **17:55 — `database-erd.md`.** The complete target-state ERD across 9 Postgres schemas (one per
   module, per `backend-architecture.md` §6), including the `persons` base-table pattern
   (ADR-106), the `bigint identity` PK exception for high-insert tables (ADR-103), and a full
   soft-delete decision per table (ADR-104).
3. **18:52 — `api-specification.md`.** 56 REST endpoints across every domain the ERD introduced,
   extending `api-guidelines.md`'s existing envelope/versioning policy rather than replacing it.
4. **19:07 — `event-catalog.md`.** 35 domain events with the priority/retry/persistence/idempotency
   policy framework (ADR-302/ADR-303) that makes the catalog's scale tractable.
5. **19:26 — `security-architecture.md`.** JWT/refresh-token/RBAC/2FA/CSRF/CORS/XSS/SQLi/secrets
   design (ADR-401–ADR-407), going deep on topics the earlier documents named but didn't fully
   specify.
6. **19:56 — `bullmq-architecture.md`.** 17 queues, the retry-tier mechanics behind
   `event-catalog.md`'s policy framework, dead-letter-queue handling (R-212), and the
   backup/maintenance/cleanup job families.
7. **22:37 — `storage-architecture.md`.** Bucket layout (ADR-502), naming, compression, versioning
   (ADR-504), and CDN preparation (ADR-503) for the `MediaStorage` interface `backend-architecture.md`
   §7 had only sketched.
8. **22:38 — `observability-architecture.md`.** The final document in the series: logs/metrics/
   traces/errors unified by `correlationId` (ADR-601), written last so it could reference every
   module/queue/event name the seven prior documents had already established.

**Same minute (22:38:55) — `.claude/CLAUDE.md` was updated** to add all eight new documents to its
index table, keeping the entry point to the knowledge base in sync with what it now contains — the
one small, immediate consistency fix in this otherwise purely additive session.

**22:55:52 — `docs/security/09-security-architecture-review.md`.** An independent architecture
security review, run against all eight documents above, scored against OWASP ASVS v4.0.3, the
OWASP Top 10, and the OWASP API Security Top 10. Found 3 Critical, 6 High, 8 Medium, and 5 Low
severity findings — overall readiness score 6.1/10 — concentrated in one central theme: the modular
monolith's core promise ("modules must never communicate directly") is enforced entirely by
*convention* in the documents as written, with no *technical* control preventing a module from
fabricating authorization or forging an event's origin. See
[KNOWN_ISSUES.md](./KNOWN_ISSUES.md#security) for every finding, and ADR-408 in
[DECISIONS.md](./DECISIONS.md) for the one finding (M-5, refresh-token hashing) that reads as a
straightforward correction rather than a design gap.

**Nothing from this session changed the real, implemented codebase.** Every document produced is
explicitly design-only, and the review itself states its findings apply to "the design, not
running code" — the real Phase 1 codebase has no authentication, write paths, or sensitive data
today, so none of the findings are currently exploitable.

---

## 2026-07-30 — Session-history investigation (meta)

A Claude Code session (`c9679314-5091-4e41-826b-179afee57670`) began investigating where prior
AZHL development conversations were stored, in response to a user question. The investigation
established that no chat transcript contained the actual engineering history above — the real
history lived entirely in git commits and filesystem state, never in a session log — which is the
direct motivating reason this permanent documentation base was created the following session,
rather than continuing to rely on chat history that didn't actually exist.

---

## 2026-08-01 — Permanent documentation base created

This document, along with [PROJECT_STATE.md](./PROJECT_STATE.md),
[IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md), [DECISIONS.md](./DECISIONS.md),
[KNOWN_ISSUES.md](./KNOWN_ISSUES.md), and [PROJECT_RULES.md](./PROJECT_RULES.md), was written by
reading the entire repository — source code, git history, every `.claude/` document, the security
review, and the actual working-tree state — as the explicit alternative to depending on chat
history that (per 2026-07-30's investigation) never actually contained this project's engineering
record. Going forward, this `docs/` directory, not any chat transcript, is the durable source of
project context.

During this pass, one previously untracked issue was newly surfaced by direct verification rather
than carried over from any prior document: **zero automated test coverage exists anywhere in the
repository**, despite `coding-standards.md` naming specific test coverage as required "before
Phase 1 is considered done" ([KNOWN_ISSUES.md AZ-F2](./KNOWN_ISSUES.md#az-f2--zero-automated-test-coverage-anywhere-in-the-repository)).
