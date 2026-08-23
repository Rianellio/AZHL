# IMPLEMENTATION_ORDER.md — AZHL Master Implementation Roadmap

The authoritative, phase-by-phase build order for AZHL. This document merges and supersedes
`.claude/roadmap.md` as the operational reference for "what phase are we in and what's next" — but
`.claude/roadmap.md` remains the canonical owner document (Product Manager agent); if the two ever
disagree, update both in the same change per `.claude/CLAUDE.md`'s drift policy.

**Two independent clocks exist in this project — do not conflate them:**

1. **Product Phases (0–5, then Future)** — what end-user-facing capability ships. This is the
   primary axis this document tracks, and the one every task must trace to per
   [PROJECT_RULES.md](./PROJECT_RULES.md) R-002.
2. **Backend Stages (1–3)** — the *internal* evolution of the backend's own architecture (modular
   monolith → hybrid → event-driven/Kafka/microservices), documented in full in
   `.claude/backend-architecture.md`. A given product phase can ship while the backend is still on
   Stage 1. Section 8 below covers this axis separately so it never gets conflated with the phase
   list.

For full decision rationale behind anything referenced here, see [DECISIONS.md](./DECISIONS.md).
For everything currently unresolved, see [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

---

## 1. Phase 0 — Foundation

**Status:** IN PROGRESS (functionally complete; see Current Progress)

### Objectives
Establish the monorepo structure, shared packages, tooling, and the permanent `.claude/`
engineering knowledge base — no end-user features.

### Dependencies
None — this is the starting point.

### Expected Deliverables
- pnpm + Turborepo monorepo scaffold
- `packages/config`, `packages/types`, `packages/utils` (real)
- `packages/database` with the Phase 1 Prisma schema and idempotent seed script
- `packages/ui` scaffold with one example primitive (`Button`)
- `apps/admin` and `apps/mobile-api` as bootable scaffolds, README-only
- `.github/workflows/ci.yml`, `docker-compose.yml`
- Husky + commitlint for Conventional Commits
- Root `README.md`
- The full `.claude/` knowledge base and all 12 agent definitions
- Local `git init` (no remote)

### Definition of Done
Every deliverable above exists and builds/lints/typechecks cleanly on a fresh checkout with a
freshly provisioned local Postgres.

### Blocking Issues
None currently open against Phase 0 itself.

### Future Phases
Directly gates Phase 1 (below).

### Current Progress
**Complete**, committed in `baf42c0` (2026-07-18). All listed deliverables exist. The `.claude/`
knowledge base has since grown well beyond its Phase 0 scope with 8 additional design-only
documents and a security review (see §7 below) — additive, not a regression of this phase's
completeness.

---

## 2. Phase 1 — League Hub

**Status:** IN PROGRESS (functionally complete; verification gap open — see Blocking Issues)

### Objectives
Ship `apps/web`'s core public experience: Home, Standings, Schedule, Game Center (box score), News
list + detail, backed by real Prisma data and a versioned `v1` API.

### Dependencies
Phase 0 complete (`packages/database`, `packages/types`, `packages/utils`, `packages/config`, and
the shared UI primitive all in place).

### Expected Deliverables
- Design system applied: Tailwind theme, restyled shadcn components, `Shell`/`Nav`/`Footer`
- Home, Standings, Schedule, Game Center, News list + detail pages
- `app/api/v1/{standings,schedule,news}` route handlers backed by
  `lib/server/services/{standings,schedule,news}.service.ts`
- Sports-domain correctness for standings sort/tie-break and schedule/game state
- Motion applied per `.claude/animation-guidelines.md`
- QA verification pass, including the critical-path E2E test named in
  `.claude/coding-standards.md`

### Definition of Done
All deliverables above ship complete for Phase 1's scope (including empty/loading/error states,
per [PROJECT_RULES.md](./PROJECT_RULES.md) R-002) **and** the test coverage `.claude/coding-standards.md`
names as required "before Phase 1 is considered done" exists and passes: Vitest coverage for the
three Phase 1 services, RTL coverage for non-visual component behavior, and one Playwright
critical-path test (home → standings → schedule → a game → news → an article).

### Blocking Issues
- **[AZ-F2](./KNOWN_ISSUES.md#az-f2--zero-automated-test-coverage-anywhere-in-the-repository)** —
  zero test coverage exists anywhere in the repository. By this phase's own documented Definition
  of Done, **Phase 1 is not actually complete** despite all its user-facing surface existing and
  working. This is the single highest-priority item blocking a clean Phase 1 close-out.
- **[AZ-I3](./KNOWN_ISSUES.md#az-i3--uncommitted-working-tree-carries-45-new-files-and-15-modified-tracked-files)**
  — a large body of *later*-phase work is uncommitted in the same working tree, which should be
  resolved (or at minimum clearly separated) before declaring Phase 1 closed, so Phase 1's own
  commit history stays legible.

### Future Phases
Gates Phase 2 (Teams & Players) and Phase 3 (Stats & History) by providing the routing/page
conventions both extend.

### Current Progress
Core Phase 1 pages/services/routes committed in `baf42c0`, with an env-loading and eslint bug fixed
in `bc2f2dc` (2026-07-19) after a full manual re-verification (build/lint/typecheck/dev server all
confirmed clean on fresh caches — the last point at which the full stack was verified end-to-end).
Since then, **uncommitted** restyling touched nearly every Phase 1 page and component
(`page.tsx`, `globals.css`, `footer.tsx`, `nav.tsx`, `schedule-list.tsx`, `standings-table.tsx`,
`score-card.tsx`, `seed.ts`) as part of the same work session that built Phase 2/3 pages — see
[PROJECT_HISTORY.md](./PROJECT_HISTORY.md) for the full change list and timeline.

---

## 3. Phase 2 — Teams & Players

**Status:** PLANNED per `roadmap.md`; **substantially built in practice** (uncommitted) — see
[KNOWN_ISSUES.md AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase)

### Objectives
Team pages, rosters, player profiles.

### Dependencies
Phase 1's data layer (`Team`, `Player`) extended with fuller roster/profile fields; Phase 1's
page/routing conventions established and reused.

### Expected Deliverables
- `/teams`, `/teams/{slug}` pages with real roster data
- `/players`, `/players/{id}` pages with full profile fields (bio, height/weight, draft info,
  headshot — none of which exist in the Phase 1 schema today)
- Schema extension: either the minimal Phase 1 `Player` model gains fields directly, or the target
  `persons`/`players`/`coaches`/`staff_members` shape from `database-erd.md` §5 (ADR-106) is
  brought forward for this specific slice — a Database Engineer + Chief Architect call, not
  pre-decided here
- Sports Data Engineer sign-off on roster/position domain rules

### Definition of Done
Team/player pages render entirely from real Prisma-backed data — no `lib/mock/*` dependency for
any field that has a real Phase 2 model. Test coverage extends to the new services.

### Blocking Issues
- **[AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase)** — the
  UI for this phase already exists, backed partly by real services and partly by `lib/mock/*`
  placeholders (ADR-706) for fields the schema doesn't support yet. The phase isn't "done" by its
  own Definition of Done above until every mock-data section is replaced by a real model — this is
  the concrete, trackable meaning of "Phase 2 completion" now that its UI already exists ahead of
  its data layer.
- **[AZ-A3](./KNOWN_ISSUES.md#az-a3--playercoachstaff-roster-history-is-not-season-scoped-design-only-self-flagged)**
  — if the target `persons`-based schema (ADR-106) is adopted for this phase, its own
  known-incomplete roster-history gap should be decided on (built now, or explicitly deferred
  again) rather than silently inherited.

### Future Phases
Gates Phase 3 (player-level stats build on Phase 2's `Player` identity).

### Current Progress
Uncommitted: `/teams`, `/teams/[slug]`, `/players`, `/players/[id]` pages; `team.service.ts` and
`player.service.ts` (real, Prisma-backed); supporting components (`full-squad`, `rink-roster`,
`player-card`, `team-select-panel`, `team-logo`, etc.); mock data for sections the schema doesn't
support (`player-bio.ts`, `player-stats.ts`, `rink-positions.ts`). See
[PROJECT_HISTORY.md](./PROJECT_HISTORY.md) for the build timeline (2026-07-24 through 2026-07-28).

---

## 4. Phase 3 — Stats & History

**Status:** PLANNED per `roadmap.md`; **partially built in practice** (uncommitted)

### Objectives
Stats center, playoffs (bracket/coverage), awards, league history.

### Dependencies
Phase 2's player/team data; a game-event or stats data model built on top of Phase 1's
`Game`/`Standing` models — concretely, the target `statistics` schema (`player_season_stats`,
`player_game_stats`, `goalie_season_stats`, `goalie_game_stats`, per `database-erd.md` §7) or an
equivalent minimal subset.

### Expected Deliverables
- `/stats` page with real skater/goalie leaderboards
- Playoffs bracket/coverage (no design exists yet beyond the `PlayoffSeries` FUTURE entity sketch
  in `.claude/erd.md`)
- Awards (same — `Award` FUTURE entity sketch only)
- League history views

### Definition of Done
Stats leaderboards render from real, derived (never hand-edited, per ADR-104's pattern applied to
`statistics.*`) data — no `lib/mock/*` dependency for any stat value shown.

### Blocking Issues
- Same AZ-A1 pattern as Phase 2: `/stats` UI already exists, backed by mock goalie/player stats
  (`goalie-stats.ts`, `player-stats.ts`) with no real underlying stat-computation model yet.
- Playoffs and Awards have no schema design at all yet, even at the design-only-document level —
  a genuine open design gap, not just an implementation gap, distinct from every other Phase 3 item.

### Future Phases
No direct product-phase dependent, but Phase 4's `apps/admin` will need write paths into
whatever stats model this phase settles on.

### Current Progress
Uncommitted: `/stats` page, `stat-leaderboard-card.tsx`, mock goalie/player stat generators. No
real stats-computation service exists yet. Playoffs/Awards: no code, no committed design beyond the
one-paragraph FUTURE sketches in `.claude/erd.md`.

---

## 5. Phase 4 — Accounts

**Status:** Not started (no code); extensively designed at the architecture-document level

### Objectives
Auth.js goes from scaffolded to real; player/team dashboards; `apps/admin` becomes a real, working
admin panel for content and roster management.

### Dependencies
Phases 1–3 data models stable enough to expose write paths; Auth.js scaffold from Phase 0 wired to
real session/user flows.

### Expected Deliverables
Per the full design-only series already written (none implemented):
- `identity` schema: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`,
  `accounts`, `sessions`, `verification_tokens`, `refresh_tokens` (`database-erd.md` §4)
- Auth endpoints: `/v1/auth/{register,login,refresh,logout,verify-email,me}`
  (`api-specification.md` §2)
- RBAC middleware + `can()` (ADR-402)
- `apps/admin` real dashboards, consuming the same `v1` write endpoints (`api-guidelines.md`)
- All of `security-architecture.md`'s §1–§9 (JWT, refresh tokens, RBAC, permissions, password
  hashing, 2FA) actually built

### Definition of Done
Every item in [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)'s Security section marked "blocking before
implementation" (AZ-S1 through AZ-S3, and AZ-S4/S5/S6/S8 before any auth code ships) is resolved
**in the source design documents** before implementation begins — per the security review's own
"Required Architecture Changes Before Implementation" list. `apps/admin` ships with real,
tested, RBAC-gated write paths — no placeholder dashboards wired to nothing.

### Blocking Issues
- **AZ-S1, AZ-S2, AZ-S3** (Critical) — module-boundary trust, Event Bus trust, Redis hardening.
  Explicitly named in the security review as prerequisites for *any* inter-module or Event Bus
  code, which real auth necessarily involves.
- **AZ-S4 through AZ-S8** (High) — should be resolved before real auth/RBAC code ships, per the
  review's production-readiness gating.
- The Phase 0/1 schema has no `User`/`Role` model at all yet — this phase starts from zero real
  identity infrastructure, only a design.

### Future Phases
Gates the Future phase's ticketing/shop (both require real accounts).

### Current Progress
Zero code. Complete design exists across `backend-architecture.md` §11–§12,
`security-architecture.md` (all 22 sections), `database-erd.md` §4, and `api-specification.md` §2–§3.

---

## 6. Phase 5 — Discovery & Media

**Status:** Not started (no code); extensively designed at the architecture-document level

### Objectives
Search, notifications, photo gallery, video highlights, sponsor placements; Cloudinary integration
goes live for real.

### Dependencies
Phase 1's news/content model; the Cloudinary adapter contract already defined in Phase 0 and left
unprovisioned until now (ADR-501).

### Expected Deliverables
Per the full design-only series:
- `media` schema (`media_assets`), Media module, `media.image.process`/`media.video.process`
  BullMQ queues (`bullmq-architecture.md` §6–§7)
- Four-bucket storage layout provisioned for real (`storage-architecture.md` §1)
- `notifications` schema, two-tier notification queue architecture (`bullmq-architecture.md` §10)
- `sponsors` table and `/v1/sponsors` endpoints
- Real Cloudinary credentials provisioned, adapter pointed at them (go-live checklist already
  written in `future-services.md`)

### Definition of Done
Photo/video upload works end-to-end through the real signed-URL flow with file-signature
verification (`security-architecture.md` §18); notifications are delivered through the real
two-tier queue with business-key dedup (ADR-303); Security Engineer has reviewed the live
signed-upload/access-control configuration before any user-facing upload path ships (already a
named requirement in `future-services.md`'s Cloudinary go-live plan).

### Blocking Issues
None yet named as specifically blocking this phase beyond its own stated dependencies — general
Critical/High security findings (AZ-S1–S3) still apply if Media/Notifications are implemented as
real modules under the target architecture.

### Future Phases
Builds the media pipeline the Future phase's live-streaming work is expected to extend, not
replace.

### Current Progress
Zero code. Complete design exists across `backend-architecture.md` §7,
`storage-architecture.md` (all 11 sections), `bullmq-architecture.md` §6–§10,
`database-erd.md` §9–§10, and `api-specification.md` §10–§12.

---

## 7. Future Phase

**Status:** Not started; partially designed

### Objectives
`apps/mobile-api` becomes real; ticketing; merchandise/shop; live streaming; Vercel and GitHub
remotes go live for real deployment and collaboration.

### Dependencies
Phase 4 auth (ticketing/shop need real accounts and payment-adjacent trust boundaries); Phase 5
media pipeline (streaming builds on the Cloudinary/media groundwork); `app/api/v1/*` proven stable
enough to be worth mirroring in `apps/mobile-api`.

### Expected Deliverables
- `apps/mobile-api` implementing the same `v1` contract (`future-services.md`, ADR-201)
- Ticketing/shop domains (`Order`/`Ticket` — shape explicitly not yet designed, deferred by
  `future-services.md`'s own scope discipline)
- Live streaming, building on Phase 5's Cloudinary groundwork
- GitHub remote go-live (6-step checklist already written in `github-strategy.md`)
- Vercel go-live (per-app project provisioning, checklist already written in `future-services.md`)

### Definition of Done
For the GitHub/Vercel go-live specifically: branch protection enabled on `main`/`develop`,
`.github/workflows/ci.yml` confirmed running successfully on the first real PR, Vercel preview
deployments working per PR. For ticketing/shop/mobile-api: no Definition of Done can be stated yet
— their shape is deliberately undesigned pending Phase 4/5 completion.

### Blocking Issues
None yet — this phase is correctly gated behind Phase 4/5 completion and hasn't started.

### Future Phases
None — this is the terminal phase in the current roadmap.

### Current Progress
Zero code, zero remote. Go-live checklists exist and are ready to execute
(`github-strategy.md`, `future-services.md`). `apps/mobile-api` exists today only as a bootable
scaffold with a README (Phase 0 deliverable).

---

## 8. Backend Stage Evolution (a separate axis — see the warning at the top of this document)

Not a product phase — the backend's own internal architectural evolution, entirely design-only
today, and not gated to any specific product phase above (it could begin as early as Phase 2 if a
real driver appeared, though nothing currently calls for it).

### Stage 1 — Modular Monolith (current design baseline)
- **What it is:** Nine business modules (`identity`, `competition`, `game-operations`,
  `statistics`, `content`, `media`, `notifications`, `analytics`, `commerce`-stub) under
  `packages/modules/*`, each with its own Postgres *schema* in one shared database instance,
  communicating via an `InMemoryEventBus` (single Node process, no persistence/replay) plus direct
  in-process calls through each module's public `index.ts` (ADR-203).
- **Current Progress:** Fully designed (`backend-architecture.md`), **zero code**. The real
  codebase today has no module boundaries at all — `lib/server/services/*` is a flat,
  un-partitioned directory, which is the correct Phase 1 shape and not itself a gap; this Stage
  simply hasn't started.
- **Trigger to begin:** A real Phase 4/5 backend implementation need — building modules
  speculatively ahead of that need would itself violate
  [PROJECT_RULES.md](./PROJECT_RULES.md) R-002.

### Stage 2 — Redis Streams bridge (optional)
- **What it is:** `RedisStreamsEventBus`, same `EventBus` interface, durable enough to survive a
  process restart, needed only once `apps/web` runs as more than one instance.
- **Current Progress:** Designed as an optional stepping stone; not required to reach Stage 3
  directly.
- **Trigger to begin:** Horizontal scaling of `apps/web` becomes real (not yet the case — no
  deployment exists at all).

### Stage 3 — Kafka / microservice extraction
- **What it is:** `KafkaEventBus`, topic-per-event-type, consumer groups per module, at-least-once
  delivery with idempotent consumers (ADR-303/ADR-304); each module's schema can then be dumped
  into its own physical database and the module extracted into its own deployable
  (`backend-architecture.md` §5's 5-step cutover checklist).
- **Current Progress:** Fully designed, zero infrastructure provisioned.
- **Trigger to begin:** A specific module has demonstrably outgrown living in-process (its own
  scaling profile, team, or release cadence) — explicitly a tool for when it's needed, not a goal
  in itself, per `backend-architecture.md` §17.

---

## 9. How to use this document

Before starting any non-trivial task, find the phase (§1–§7) it belongs to, confirm its
Dependencies are actually met (not just "probably fine"), and check its Blocking Issues before
treating it as ready to build. If a task doesn't fit any listed Deliverable for the current phase,
that's the [PROJECT_RULES.md](./PROJECT_RULES.md) R-002 signal to stop and route to Product
Manager rather than build it — the same rule that Phase 2/3's work should have triggered and
didn't (see [KNOWN_ISSUES.md AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase)).
