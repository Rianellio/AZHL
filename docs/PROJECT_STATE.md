# PROJECT_STATE.md — AZHL Current Project State

The single-page snapshot of where AZHL actually stands, verified directly against the repository
rather than assumed from prior documentation. This is the first document a new engineer should
read. For deeper detail, follow the links inline rather than expecting this page to repeat it —
this page summarizes; [DECISIONS.md](./DECISIONS.md), [PROJECT_HISTORY.md](./PROJECT_HISTORY.md),
[IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md), [KNOWN_ISSUES.md](./KNOWN_ISSUES.md), and
[PROJECT_RULES.md](./PROJECT_RULES.md) hold the full record.

*Last verified against the repository: 2026-08-01.*

---

## Current Phase

Per `.claude/roadmap.md`, AZHL is officially in **Phase 0 (Foundation)** and **Phase 1 (League
Hub)**, both marked IN PROGRESS. In practice, substantial **Phase 2 (Teams & Players)** and
**Phase 3 (Stats & History)** frontend work already exists, uncommitted, built ahead of the
documented phase gate — see
[KNOWN_ISSUES.md AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase)
and [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) §3–§4 for how this is being tracked and
resolved. Phases 4 and 5 exist only as design documents; the Future phase is undesigned beyond a
go-live checklist.

A separate, independent axis — the backend's own **Stage 1/2/3** architectural evolution
(modular monolith → Kafka/microservices) — is fully designed but has **zero implementation**.
See [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) §8. Do not confuse this with the product
phases above; they are different clocks.

---

## Completed Milestones

- **Phase 0 (Foundation):** complete. Monorepo scaffold, shared packages, tooling, and the full
  `.claude/` knowledge base — committed in `baf42c0` (2026-07-18).
- **Phase 1 (League Hub) core surface:** complete and functionally working — Home, Standings,
  Schedule, Game Center, News, backed by real services and `v1` API routes — committed in
  `baf42c0`, env/lint-fixed in `bc2f2dc` (2026-07-19).
- **A working local dev environment:** confirmed via a full manual re-verification after
  `bc2f2dc` (build/lint/typecheck/dev server all clean on fresh caches) — the last point this was
  confirmed end-to-end (see below, Release Readiness).
- **A complete design-only backend architecture series:** 8 documents (`backend-architecture.md`
  through `observability-architecture.md`) plus an independent security review, written
  2026-07-29. Nothing in it is built; see [PROJECT_HISTORY.md](./PROJECT_HISTORY.md) for the full
  authorship order and [DECISIONS.md](./DECISIONS.md) `3xx`–`6xx` for the decisions it contains.
- **This documentation base itself** (`docs/PROJECT_STATE.md` and its five companion documents),
  created 2026-08-01 as the permanent, repository-resident replacement for chat-history-dependent
  project context.

Full detail: [PROJECT_HISTORY.md](./PROJECT_HISTORY.md).

---

## Work In Progress

All of the following exist only in the **uncommitted working tree** as of this document's
creation (~45 new files, 15 modified tracked files):

- **Phase 2/3 frontend surface:** `/teams`, `/teams/[slug]`, `/players`, `/players/[id]`,
  `/stats`, `/league`, `/contacts` — built 2026-07-24 through 2026-07-28, mixing real
  Prisma-backed services (`team.service.ts`, `player.service.ts`) with a deliberate,
  firewalled mock-data layer (`lib/mock/*`) for schema gaps (ADR-706).
- **Restyling of Phase 1 surfaces** touched by the same work: `globals.css`, home page, footer,
  nav, schedule list, score card, standings table, seed data.
- **Brand identity assets:** league logo, four team logos.
- **The design-only backend architecture series and its security review** (see Completed
  Milestones above — "written" and "committed" are different things; none of this is committed).

Full file-level detail with timestamps: [PROJECT_HISTORY.md](./PROJECT_HISTORY.md).

---

## Blockers

- **Phase 1 is not actually "done" by its own owning document's definition.**
  `.claude/coding-standards.md` requires Vitest coverage for services, RTL coverage for
  components, and a critical-path Playwright E2E test "before Phase 1 is considered done." None
  exist. See [KNOWN_ISSUES.md AZ-F2](./KNOWN_ISSUES.md#az-f2--zero-automated-test-coverage-anywhere-in-the-repository).
  This is the single highest-priority open item.
- **Three Critical security findings block starting any real implementation of the design-only
  backend architecture:** unforgeable module authorization context, Event Bus publisher
  authentication, and Redis hardening. See
  [KNOWN_ISSUES.md AZ-S1–AZ-S3](./KNOWN_ISSUES.md#security). These do not block current Phase
  1/2/3 frontend work — they block *starting* Phase 4/5's backend implementation.
- **Roadmap/reality drift** ([KNOWN_ISSUES.md AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase))
  needs a Product Manager decision before Phase 2/3 can be meaningfully marked "in progress" or
  "done" against any acceptance criteria.
- **A large uncommitted working tree** ([KNOWN_ISSUES.md AZ-I3](./KNOWN_ISSUES.md#az-i3--uncommitted-working-tree-carries-45-new-files-and-15-modified-tracked-files))
  is a standing risk until committed.

---

## Next Priorities

In recommended order (full reasoning in [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md)):

1. Resolve [AZ-A1](./KNOWN_ISSUES.md#az-a1--frontend-built-ahead-of-the-documented-roadmap-phase)
   — a Product Manager pass to reconcile `roadmap.md` against the Phase 2/3 work that already
   exists.
2. Commit the working tree in logically-scoped, Conventional-Commits chunks (resolves
   [AZ-I3](./KNOWN_ISSUES.md#az-i3--uncommitted-working-tree-carries-45-new-files-and-15-modified-tracked-files)).
3. Stand up test coverage per `coding-standards.md`'s existing (not new) requirement, starting
   with the five real services (resolves
   [AZ-F2](./KNOWN_ISSUES.md#az-f2--zero-automated-test-coverage-anywhere-in-the-repository)).
4. Run a full `pnpm build && pnpm lint && pnpm typecheck` verification on the current tree — the
   last confirmed-clean state predates all of the 2026-07-24 through 2026-07-29 work.
5. Rename or remove the stray asset file
   ([AZ-F1](./KNOWN_ISSUES.md#az-f1--stray-non-brand-image-asset-in-publiclogos)).
6. Only after the above: resume forward feature work, gated against the (by then reconciled)
   roadmap.

---

## Release Readiness

**Not production-ready, and not close to a first deploy decision** — no release has ever been
attempted, and none of the infrastructure to attempt one exists yet:

- No GitHub remote, no CI execution ever, no branch protection — a deliberate Phase 0 decision
  (ADR-006), not a gap, but still true today.
- No Vercel project provisioned; `vercel.json` exists but nothing is deployed.
- No real Cloudinary, Redis, or any Phase 4+ infrastructure provisioned — all design-only.
- The **last full-stack manual verification** (build/lint/typecheck/dev server) was performed
  right after commit `bc2f2dc` (2026-07-19), **before** the five days of Phase 2/3 frontend work
  and the backend-architecture-series session that followed. The current working tree's actual
  build health is unverified as of this document.
- Phase 1's own Definition of Done (test coverage) is unmet — see Blockers above.

## Technical Debt

- Zero automated tests anywhere in the repository (highest-priority item — see Blockers).
- Roadmap/reality drift from Phase 2/3 work built ahead of schedule.
- Uncommitted work at risk of loss.
- A stray, incorrectly-named image asset in a public directory.
- Design-only documents (`backend-architecture.md` and its 7 siblings) carry known, reviewed
  defects (3 Critical, 6 High, 8 Medium, 5 Low security findings) that must be corrected in the
  documents themselves before implementation begins — see [KNOWN_ISSUES.md](./KNOWN_ISSUES.md#security).
  This is debt in the *design*, not the running system, since nothing built yet is affected.
- `database-erd.md`'s own self-flagged gap: player/coach/staff roster history isn't season-scoped
  (ADR-106) — a known, deliberately deferred design incompleteness, not a bug.

---

## Current Architecture Status

- **Real, implemented architecture:** the services→RSC/API pattern (ADR-002) — a single flat
  `lib/server/services/*` directory, no module boundaries, matching Phase 1's intentionally simple
  scope. This is correct for where the project actually is, not a shortfall against the design-only
  series below.
- **Designed, not implemented:** a full modular-monolith architecture (9 business modules, one
  Postgres schema each, an Event Bus, RBAC, structured logging, BullMQ, object storage,
  observability) — see [DECISIONS.md](./DECISIONS.md) `2xx`–`6xx` for the complete decision set,
  and [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) §8 for its Stage 1/2/3 rollout.
- **Independently reviewed:** the design-only architecture has been security-reviewed against
  OWASP ASVS/Top 10/API Top 10 (overall score 6.1/10) — see
  [KNOWN_ISSUES.md](./KNOWN_ISSUES.md#security) for the full finding set.

## Backend Status

- **5 real services:** `standings.service.ts`, `schedule.service.ts`, `news.service.ts` (Phase 1,
  committed), `player.service.ts`, `team.service.ts` (Phase 2, uncommitted) — all real, all
  Prisma-backed, all following the services-are-the-source-of-truth rule
  ([PROJECT_RULES.md](./PROJECT_RULES.md) R-101).
- **5 real API routes:** `app/api/v1/{standings,schedule,news}` (committed); no route handlers
  exist yet for players/teams despite their services existing — the Phase 2 pages currently call
  their services directly from Server Components only.
- **Zero real auth, RBAC, events, queues, or storage infrastructure.** Everything described in
  `backend-architecture.md` and its siblings is design-only.

## Frontend Status

- **Phase 1 core:** complete, functional, restyled as of 2026-07-28 (uncommitted restyle on top of
  the committed baseline).
- **Phase 2/3 surface:** 7 additional pages built and functional, mixing real and mock data per
  ADR-706's firewall rule — see Work In Progress above.
- **Design system:** dark-mode-only (ADR-701), semantic tokens, two motion curves (ADR-703),
  glassmorphism restricted to two surfaces (ADR-704) — all implemented and, per the codebase as
  read, followed consistently in the pages built through 2026-07-28.
- **`packages/ui`:** still a one-component scaffold (ADR-705) — correct, no premature promotion
  has occurred.

## Infrastructure Status

- **Local dev:** pnpm + Turborepo work; per-package `.env` files exist and are correctly
  gitignored (ADR-802). Docker Compose for local Postgres is documented but unverified as runnable
  on every developer machine — see [KNOWN_ISSUES.md AZ-I1](./KNOWN_ISSUES.md#az-i1--local-docker-compose-postgres-is-not-runnable-on-the-current-development-machine).
- **CI:** written (`.github/workflows/ci.yml`), never executed — no remote exists to trigger it.
- **Deployment:** none. No Vercel project, no live environment, no Cloudinary account.
- **Version control:** local git only, `main` branch, 2 commits, Conventional Commits enforced via
  Husky/commitlint on every local commit regardless of the missing remote.
