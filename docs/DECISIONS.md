# DECISIONS.md — AZHL Architectural Decision Log

Every architectural decision made for AZHL, in one place, in the template below. This is the
permanent record of **why** the system looks the way it does — not just what it does. Source of
truth for each entry is the `.claude/` document(s) cited in **Cross References**; if code and this
log ever disagree, the code (or the owning `.claude/` doc) wins and this log should be corrected in
the same change, per [PROJECT_RULES.md](./PROJECT_RULES.md)'s documentation-before-invention rule.

**Status values used below:**
- **Accepted — Implemented**: real, in the codebase today.
- **Accepted — Design Only**: approved direction, written down in `.claude/`, nothing built yet.
  Building ahead of its phase is itself a rule violation — see
  [PROJECT_RULES.md](./PROJECT_RULES.md) and [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md).
- **Superseded**: an earlier approach that was replaced; kept here for history, per
  [PROJECT_HISTORY.md](./PROJECT_HISTORY.md).
- **Under Review**: a design-stage decision an independent review has flagged as likely wrong;
  not yet corrected in its source document. See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for the
  finding.

Decision IDs are grouped by domain into number bands so related decisions sort together:
`0xx` Foundation/Monorepo · `1xx` Data & Persistence · `2xx` API & Backend Pattern ·
`3xx` Event-Driven Architecture (design-only) · `4xx` Security & Auth ·
`5xx` Storage & Media (design-only) · `6xx` Observability (design-only) ·
`7xx` Frontend & Design System · `8xx` Process & DevOps.

---

## 0xx — Foundation & Monorepo

### ADR-001 — Multi-app monorepo from day one
- **Status:** Accepted — Implemented
- **Context:** AZHL is expected to grow into a public site, an admin panel, and a mobile API, each
  with different release cadences and trust boundaries. Building a single app and splitting it
  later means untangling shared state and accidental coupling after the fact.
- **Decision:** pnpm workspaces + Turborepo, with `apps/web` (real), `apps/admin` and
  `apps/mobile-api` (bootable scaffolds, README-only until their phase), and
  `packages/{database,types,utils,ui,config}`.
- **Alternatives Considered:** Single Next.js app with route groups for admin/mobile logic —
  rejected because it couples deploy cadence and blast radius across audiences with fundamentally
  different trust levels (public fans vs. authenticated staff vs. third-party API consumers).
- **Consequences:** Structure is set up before there's business logic to justify it, which is a
  deliberate inversion of YAGNI for *structure* specifically (cheap now, expensive to retrofit)
  while still applying YAGNI to *logic* inside that structure (see ADR-004).
- **Future Evolution:** `apps/admin` goes real in Phase 4; `apps/mobile-api` goes real in the
  Future phase. See [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md).
- **Cross References:** `.claude/architecture.md`, `.claude/engineering-principles.md`

### ADR-002 — Services → RSC/API pattern
- **Status:** Accepted — Implemented
- **Context:** Next.js App Router allows both direct Server Component data access and route
  handlers; without a rule, business logic tends to duplicate across both paths.
- **Decision:** `lib/server/services/*` is the only code allowed to import `@azhl/database`.
  Server Components call service functions directly (in-process, no self-fetch); `app/api/v1/*`
  route handlers call the same functions and adapt the result to the REST envelope.
- **Alternatives Considered:** GraphQL resolvers as the single access layer — rejected as
  unjustified complexity with no current multi-client shape mismatch to solve (see ADR-201).
- **Consequences:** One implementation, two consumers. A route handler over ~15–20 lines is a
  signal logic leaked into it that belongs in a service.
- **Future Evolution:** Generalizes into per-module `infrastructure/repositories/*` under
  ADR-101's module boundaries once the backend evolves past Stage 1.
- **Cross References:** `.claude/architecture.md`, `.claude/coding-standards.md`,
  `.claude/api-guidelines.md`

### ADR-003 — Separate apps, not folders, for admin/mobile-api
- **Status:** Accepted — Implemented
- **Context:** It would be simpler short-term to add `/admin` routes and a `/api/mobile` namespace
  inside `apps/web`.
- **Decision:** `apps/admin` and `apps/mobile-api` are independent Next.js/standalone deployables.
- **Alternatives Considered:** Route groups inside `apps/web` — rejected for blast radius (a bad
  admin deploy could take down the public site), deploy-cadence coupling, and shipping
  admin/mobile-only dependencies to the public bundle.
- **Consequences:** Two apps exist today as empty scaffolds with no functional payoff yet — an
  accepted, deliberate cost.
- **Future Evolution:** N/A — this is the permanent shape.
- **Cross References:** `.claude/architecture.md`, `.claude/engineering-principles.md`

### ADR-004 — No speculative or half-finished features; phase-gated roadmap
- **Status:** Accepted — Implemented (governs process, not a single artifact)
- **Context:** Without an explicit rule, "we'll need it eventually" reasoning creeps into scope.
- **Decision:** Every non-trivial task must trace to a bullet in the current roadmap phase
  ([IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md)). A feature that ships, ships complete for
  its phase's scope (including empty/loading/error states) — no dead code paths "for later."
- **Alternatives Considered:** Ship partial features behind flags — rejected; half-finished code
  looks done, so it doesn't get flagged, and the next person inherits an invisible gap.
- **Consequences:** `packages/ui` stays a near-empty scaffold; `apps/admin`/`apps/mobile-api` stay
  READMEs. See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for the one place this has already been
  violated in practice (Phase 2/3 frontend pages built ahead of roadmap).
- **Future Evolution:** N/A — permanent operating rule.
- **Cross References:** `.claude/MASTER_SYSTEM_PROMPT.md` rule 5, `.claude/engineering-principles.md`

### ADR-005 — Trust internal guarantees; validate only at boundaries
- **Status:** Accepted — Implemented
- **Context:** Defensive re-validation at every layer adds noise without adding safety and
  obscures where the real trust boundary is.
- **Decision:** `lib/server/services/*` trusts its typed arguments and Prisma's return shape.
  Validation happens where untrusted input enters: `app/api/v1/*` parsing, and (Phase 4+) Auth.js
  input handling.
- **Alternatives Considered:** Defense-in-depth validation at every function — rejected as noise
  that doesn't change actual safety.
- **Consequences:** A service function is not responsible for re-checking what its caller's types
  already guarantee.
- **Future Evolution:** ADR-303's event validation (publish- and consume-side) is a *deliberate
  exception* to this rule, justified by the bus's own consistency guarantees weakening once Kafka
  is introduced (Stage 3).
- **Cross References:** `.claude/engineering-principles.md`

### ADR-006 — Local git only; no remote until an explicit go-live
- **Status:** Accepted — Implemented
- **Context:** A team could provision a GitHub remote reflexively at project start.
- **Decision:** `git init` locally only. Husky + commitlint enforce Conventional Commits on every
  local commit regardless. `.github/workflows/ci.yml` is written and valid but has nothing to run
  against.
- **Alternatives Considered:** Provision a remote immediately — explicitly rejected; not an
  oversight.
- **Consequences:** No PR flow, no CI execution, no branch protection exist yet, even though the
  conventions (`main`/`develop`/`feature/*`) are already followed.
- **Future Evolution:** A documented 6-step go-live checklist exists for when a remote is wanted.
  See [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) Future phase.
- **Cross References:** `.claude/github-strategy.md`

---

## 1xx — Data & Persistence

### ADR-101 — Hard deletes with cascade, Phase 1 only
- **Status:** Accepted — Implemented (Phase 1 scope only)
- **Context:** Phase 1 data (league/season/team/player) is entirely admin-seeded, not
  user-generated; there is no audit-trail or undo need yet.
- **Decision:** `onDelete: Cascade` throughout Phase 1's schema; no soft-delete columns.
- **Alternatives Considered:** Soft delete everywhere pre-emptively — rejected as dead complexity
  with no current model that needs it.
- **Consequences:** Deleting a team genuinely removes its dependent rows.
- **Future Evolution:** Revisited starting Phase 4 once `User`-authored content exists. The full
  target-state answer is already designed per-table in ADR-104 (a table-by-table
  soft-delete-or-not rule), superseding this Phase-1-only stance once implemented.
- **Cross References:** `.claude/database-guidelines.md`, `.claude/database-erd.md` §13

### ADR-102 — `cuid()` primary keys, `@@map`'d plural snake_case tables
- **Status:** Accepted — Implemented
- **Context:** Auto-increment integers are guessable and awkward for client-side pre-generation;
  Prisma/TypeScript-land and SQL-land naming conventions differ.
- **Decision:** Every Phase 1 model uses `cuid()` PKs; every model maps via `@@map` to a plural
  snake_case table; fields are camelCase in Prisma, matching TS naming.
- **Alternatives Considered:** Integer auto-increment — rejected (collision/enumeration properties
  worse for a public-facing product).
- **Consequences:** No mental translation needed between the ORM layer and the DB layer.
- **Future Evolution:** ADR-103 refines this for the small set of very-high-insert-volume tables in
  the target ERD.
- **Cross References:** `.claude/database-guidelines.md`

### ADR-103 — `bigint identity` PKs for high-insert append-only tables (design-only)
- **Status:** Accepted — Design Only
- **Context:** `cuid`/UUID-style random keys fragment a B-tree index at high insert rates — every
  insert lands in a random leaf page instead of the rightmost one.
- **Decision:** `game_events`, `player_game_stats`, `goalie_game_stats`, and `audit_logs` use a
  `bigint GENERATED ALWAYS AS IDENTITY` PK instead of `cuid`, keeping inserts append-only at the
  index level.
- **Alternatives Considered:** `cuid` everywhere for consistency — rejected for these four tables
  specifically due to measured index-locality cost at live-game insert volume. UUIDv7 — noted as
  the correct swap *if* client-generated pre-insert IDs are ever needed (e.g. offline-first mobile
  scoring), not chosen now.
- **Consequences:** Two ID strategies coexist in the schema, by design, not oversight.
- **Future Evolution:** Applies to any future table with the same insert-volume profile.
- **Cross References:** `.claude/database-erd.md` §1, §14

### ADR-104 — Soft-delete decided per-table by a single test
- **Status:** Accepted — Design Only
- **Context:** A blanket soft-delete policy or a blanket hard-delete policy both fail somewhere in
  a schema this varied.
- **Decision:** The rule: *would hiding this row break another schema's ability to explain its own
  history via an ID reference it holds?* If yes → soft delete (`deleted_at`). If the table is
  ephemeral, fully derived, or small reference data nothing else depends on → hard delete.
  Full table-by-table answer given in `database-erd.md` §13.
- **Alternatives Considered:** Uniform policy — rejected as either over- or under-engineered
  depending on the table.
- **Consequences:** `users`, `teams`, `persons`/`players`/`coaches`/`staff`, `sponsors`,
  `news_articles`, `media_assets` soft-delete; `sessions`, `game_events`, all of `statistics.*`,
  `audit_logs` (deliberately — see ADR-407) do not.
- **Future Evolution:** Applied automatically to any new table by re-asking the same question.
- **Cross References:** `.claude/database-erd.md` §13, `.claude/database-guidelines.md`

### ADR-105 — Idempotent seed via `upsert` on natural unique keys
- **Status:** Accepted — Implemented
- **Context:** A seed script that errors or duplicates on re-run is unsafe to use in a
  reset-without-drop workflow.
- **Decision:** `packages/database/prisma/seed.ts` upserts every model on its real unique
  constraint (`League.slug`, `Team.abbreviation`, `Player`'s `teamId_jerseyNumber`,
  `NewsArticle.slug`, `Standing`'s `seasonId_teamId`). `Game` is the one exception, seeded with
  plain `create` since it has no natural unique key in Phase 1.
- **Alternatives Considered:** Manual "does this exist" guard before `create` — rejected;
  `upsert` on a real constraint is simpler and can't drift out of sync with the guard logic.
- **Consequences:** The seed script is safe to run repeatedly, except for `Game` rows, which
  requires an empty database.
- **Future Evolution:** If `Game` re-run idempotency is ever needed, add a synthetic unique key
  (`seasonId + homeTeamId + awayTeamId + startTime`) rather than leaving it `create`-only.
- **Cross References:** `.claude/database-guidelines.md`

### ADR-106 — `persons` base table for shared player/coach/staff biography (design-only)
- **Status:** Accepted — Design Only
- **Context:** Players, coaches, and staff share the same bio shape (name, DOB, nationality,
  photo), and the same real person can hold different roles over a career (a retired player
  becoming a coach).
- **Decision:** A `persons` table holds shared bio data once; `players`, `coaches`,
  `staff_members` each hold a unique 1:1 FK to `persons` plus only their role-specific fields
  (class-table inheritance).
- **Alternatives Considered:** Three fully independent tables with duplicated bio fields —
  explicitly noted as a legitimate scope-reduction alternative if the extra join isn't worth it;
  `persons` is the recommended default, not the only valid shape.
- **Consequences:** One extra join for full profile data; no duplicated bio fields to keep in sync.
- **Future Evolution:** A season-scoped roster-history table (`team_id` + `season_id` +
  `player_id`) is the known next step once a `team_id`-only-tracks-current-team limitation matters
  — explicitly deferred, not designed further. See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).
- **Cross References:** `.claude/database-erd.md` §5

### ADR-107 — Sponsors and Partners are one table, distinguished by `tier`
- **Status:** Accepted — Design Only
- **Context:** The originally-requested "Sponsors" and "Partners" concepts have identical shape
  (name, logo, link, tier) with no structural difference.
- **Decision:** One `sponsors` table with a `tier: "official" | "partner"` column, matching the
  platform's existing partner placeholder data's own framing.
- **Alternatives Considered:** Two separate tables — rejected as modeling one entity twice.
- **Consequences:** Display distinction ("Official Partner" vs. general sponsor) is a column value,
  not a schema fork.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/database-erd.md` §5

### ADR-108 — No cross-schema foreign keys (design-only target schema)
- **Status:** Accepted — Design Only
- **Context:** The target architecture assigns each module its own Postgres schema (ADR-102's
  successor at scale) as groundwork for eventual per-module database extraction.
- **Decision:** A `references` clause only ever points within the same schema. Cross-module
  relationships are plain ID columns with no FK, resolved either via a live call through the
  owning module's public interface (ADR-201) or a denormalized snapshot in an event payload
  (ADR-301).
- **Alternatives Considered:** Cross-schema FKs for stronger DB-enforced integrity — rejected;
  would prevent ever separating schemas into independent databases (ADR-109) without a migration.
- **Consequences:** No FK-enforced integrity for e.g. `games.home_team_id` → `teams.id`; see
  ADR-402/[KNOWN_ISSUES.md](./KNOWN_ISSUES.md) H-6 for the compensating-control gap this leaves
  open.
- **Future Evolution:** Enforced by physical schema separation from the start, not bolted on later.
- **Cross References:** `.claude/backend-architecture.md` §3 rule 4, `.claude/database-erd.md` §1

### ADR-109 — One Postgres database, one schema per module (Stage 1); own database per module (Stage 3)
- **Status:** Accepted — Design Only
- **Context:** A future module extraction (ADR-301's Stage 3) needs the database boundary to
  already exist logically, or extraction becomes a data-modeling exercise under pressure.
- **Decision:** Stage 1: one physical Postgres instance, one Postgres *schema* per module via
  Prisma's `multiSchema` support, least-privilege DB roles per module from day one. Stage 3: a
  module's schema is dumped/restored into its own database instance on extraction — a
  `pg_dump`/`pg_restore`, not a redesign, because ADR-108 already forbade cross-schema FKs.
- **Alternatives Considered:** One shared schema — rejected; would make later extraction a genuine
  data-modeling project instead of an infrastructure change.
- **Consequences:** Least-privilege DB credentials are set up now, at zero cost, rather than
  deferred to extraction time under pressure.
- **Future Evolution:** Read replicas become viable per-module-schema once one module's read
  volume outgrows a shared primary.
- **Cross References:** `.claude/backend-architecture.md` §6

---

## 2xx — API & Backend Pattern

### ADR-201 — No API gateway/BFF until a demonstrated need
- **Status:** Accepted — Design Only (governs both real and future API surface)
- **Context:** GraphQL, a gateway, or per-client aggregation endpoints could be introduced
  speculatively "for when mobile/third-party clients exist."
- **Decision:** `app/api/v1/*`'s existing REST contract (ADR-202) is the single surface for every
  consumer — `apps/mobile-api` and third-party API keys reuse it, not a parallel contract. A
  gateway is only added in front of it if a real shape mismatch is demonstrated.
- **Alternatives Considered:** Build GraphQL/BFF now — rejected as speculative complexity with no
  current consumer that needs it.
- **Consequences:** `apps/mobile-api` has no bespoke endpoint shape anywhere in the target design.
- **Future Evolution:** Addition in front of `v1`, never a rewrite of it, if/when justified.
- **Cross References:** `.claude/backend-architecture.md` §10, `.claude/future-services.md`

### ADR-202 — `/api/v1/*` versioning: additive in-place, breaking changes get `/v2/*`
- **Status:** Accepted — Implemented (policy); real routes are minimal today
- **Context:** An unversioned or ad hoc-versioned API forces a painful judgment call under
  pressure the first time a breaking change is needed.
- **Decision:** Every route lives under a real, permanent `v1` segment. Additive changes ship into
  `v1` directly; breaking changes require a new `v2` tree, with `v1` kept working until every
  consumer has migrated. External (API-key) consumers additionally get `Deprecation`/`Sunset`
  headers with a 90-day minimum notice.
- **Alternatives Considered:** No versioning ("nothing external depends on it yet") — rejected;
  the entire value of versioning from day one is never having to make that call under pressure
  later.
- **Consequences:** `ApiResponse<T>` envelope (`{data}`/`{error}`) is the single shared response
  shape, defined once in `packages/types/src/api.ts`.
- **Future Evolution:** `v2` created only on an actual breaking need.
- **Cross References:** `.claude/api-guidelines.md`, `.claude/api-specification.md` §1.1

### ADR-203 — Modular monolith with an in-process Event Bus (Stage 1), migrating to Kafka (Stage 3)
- **Status:** Accepted — Design Only
- **Context:** The current codebase has no module boundaries beyond app/package; a future backend
  with real write paths, notifications, and stats recomputation needs a way to add capability
  without a growing pile of ad hoc cross-cutting calls.
- **Decision:** Nine business modules (`identity`, `competition`, `game-operations`,
  `statistics`, `content`, `media`, `notifications`, `analytics`, `commerce`-stub) each own their
  own data and behavior, communicating via three rules only: (1) a module's Prisma models are
  queried only by that module's own repositories, (2) synchronous cross-module *reads* go through
  the owning module's public `index.ts`, never its database, (3) everything else goes through an
  `EventBus` interface — `publish`/`subscribe` — never a direct call between modules. A fourth
  rule (no cross-schema FKs) is ADR-108.
- **Alternatives Considered:** Direct module-to-module function calls for everything — rejected;
  couples modules tightly enough that extraction later requires untangling hidden dependencies.
  Starting on Kafka immediately — rejected as premature operational overhead for a single-process
  system with no real event volume yet.
- **Consequences:** A "rule of thumb" governs the call-vs-event choice: direct call when the
  caller needs an answer to proceed now; event when the caller just needs to announce a fact.
- **Future Evolution:** Stage 1 `InMemoryEventBus` (no persistence/replay) → optional Stage 2
  `RedisStreamsEventBus` (once `apps/web` runs more than one instance) → Stage 3 `KafkaEventBus`
  (topic-per-event-type, consumer groups per module, at-least-once + idempotent consumers). The
  interface never changes across stages; only the implementation swapped via `EVENT_BUS_DRIVER`.
- **Cross References:** `.claude/backend-architecture.md` §1–§5, `.claude/event-catalog.md`

### ADR-204 — Route handlers stay thin; all business logic lives in a module's application layer
- **Status:** Accepted — Design Only (extends ADR-002 to the module architecture)
- **Context:** Without a rule, filtering/sorting/derived-field logic tends to leak into route
  handlers.
- **Decision:** A route handler parses/validates the request, calls a module's public function
  (or, today, a `lib/server/services/*` function), and shapes the result — nothing else.
- **Alternatives Considered:** N/A — direct continuation of ADR-002 at module scale.
- **Consequences:** Same "~15–20 line handler body" smell test as ADR-002.
- **Future Evolution:** The module boundary becomes invisible to the route handler once modules
  exist — its calling convention doesn't change.
- **Cross References:** `.claude/api-guidelines.md`, `.claude/backend-architecture.md` §10

### ADR-205 — Zod for all runtime validation, one library end-to-end (design-only, not installed)
- **Status:** Accepted — Design Only
- **Context:** Request payloads, event payloads, and environment variables all need runtime
  validation that also yields a static TypeScript type.
- **Decision:** Zod, used at three points: API request bodies/query params, event payloads on both
  publish and consume (defense in depth for Stage 3's Kafka), and process-boot environment
  validation. Schemas live colocated with the types they validate, not centralized.
- **Alternatives Considered:** Hand-written validation per endpoint — rejected as inconsistent and
  error-prone at 56+ endpoints.
- **Consequences:** A validation failure always throws the shared `ValidationError` (ADR-207),
  mapped to `400`/`422`.
- **Future Evolution:** N/A once implemented — this is the permanent validation layer.
- **Cross References:** `.claude/backend-architecture.md` §15

### ADR-206 — Standard error catalog and status-code table
- **Status:** Accepted — Implemented (partial, real 3 routes) / Design Only (full catalog)
- **Context:** Ad hoc error shapes per endpoint make client error handling brittle.
- **Decision:** A closed set of `code` values (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
  `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`) each mapped to one HTTP status; every
  endpoint documents only the codes *beyond* this default set that it can uniquely produce.
- **Alternatives Considered:** Per-endpoint bespoke error shapes — rejected for consistency.
- **Consequences:** No verbose error detail (stack traces, Prisma internals) ever crosses the API
  boundary — a security property as much as an API-hygiene one.
- **Future Evolution:** N/A — this is the permanent contract.
- **Cross References:** `.claude/api-guidelines.md`, `.claude/api-specification.md` §1.8

### ADR-207 — Typed error base-class hierarchy, mapped once at the API boundary
- **Status:** Accepted — Design Only
- **Context:** Errors need to be handled once, at the right layer — not re-caught and re-thrown
  repeatedly.
- **Decision:** `packages/platform/errors` defines `NotFoundError`, `ValidationError`,
  `ConflictError`, `UnauthorizedError`, `ForbiddenError`, each carrying a stable `code` matching
  ADR-206. Services/modules throw these; a repository catches a raw Prisma failure and re-throws
  one of them. Only the API layer (route handler) translates a typed error into an HTTP status.
- **Alternatives Considered:** Ad hoc thrown values per module — rejected; the API layer would
  have to guess at arbitrary shapes.
- **Consequences:** A module never leaks its own internals (Prisma errors, stack traces) across
  its own boundary or the API boundary.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/coding-standards.md`, `.claude/backend-architecture.md` §14

---

## 3xx — Event-Driven Architecture (design-only)

### ADR-301 — Denormalized event payloads (no synchronous callback needed by consumers)
- **Status:** Accepted — Design Only
- **Context:** A thin event payload (IDs only) would force every consumer to call back into the
  publishing module for display data, reintroducing coupling ADR-203 exists to avoid.
- **Decision:** Event payloads carry enough denormalized data (e.g. `game.finished` includes team
  *names*, not just IDs) for a typical consumer to act without a follow-up lookup.
- **Alternatives Considered:** ID-only payloads — rejected; would force Notifications back into a
  synchronous dependency on Competition for every message it composes.
- **Consequences:** Slightly larger event payloads, in exchange for genuine module independence.
- **Future Evolution:** N/A — permanent pattern for every new event.
- **Cross References:** `.claude/backend-architecture.md` §3 rule 4, §4; `.claude/event-catalog.md` §6

### ADR-302 — Three-tier priority/retry policy framework, P0 events get the *weakest* retry
- **Status:** Accepted — Design Only
- **Context:** A live sports platform's events span "must reach an open browser tab in
  milliseconds" to "fine within seconds" — one retry policy for all events is wrong in both
  directions.
- **Decision:** Priority tiers P0 (live)/P1 (high)/P2 (normal); retry tiers RT-Live (1 attempt, no
  DLQ)/RT-Standard (3, exponential backoff, DLQ)/RT-Strict (5, longer backoff, DLQ + page).
  **P0 events deliberately get RT-Live, the weakest policy** — retrying a stale
  `game.goal_scored` with backoff risks delivering out-of-order state to a live-watching user; the
  correct backstop is client-side reconciliation polling (every P0 consumer also polls
  authoritative state every 15–30s), not retry-until-success.
- **Alternatives Considered:** Uniform strong retry for everything — rejected; would make live
  events *less* correct, not more reliable, by risking out-of-order delivery.
- **Consequences:** Every P0 consumer must implement the reconciliation-polling backstop explicitly
  — documented as an implementation requirement, not optional.
- **Future Evolution:** No P3/"low" tier exists; add one only if a genuinely low-urgency event
  type appears.
- **Cross References:** `.claude/event-catalog.md` §2.1–§2.3

### ADR-303 — Dual idempotency: envelope-ID dedup by default, business-key dedup where duplication is user-visible
- **Status:** Accepted — Design Only
- **Context:** Envelope-ID dedup alone only catches exact redelivery of the same message — it
  doesn't catch a producer publishing a *new* event (new ID) describing the same underlying fact
  after a partial failure.
- **Decision:** Default: every consumer checks `DomainEvent.id` against a Redis-backed
  processed-IDs set. Additionally, for user-visible side effects (`notification.requested` above
  all), dedup on a business key (`userId, topic, referenceId`).
- **Alternatives Considered:** Envelope-ID dedup only — rejected as insufficient for the specific
  failure mode of double-notifying a user, which this document calls out as the most visible
  failure mode the whole catalog is designed to avoid.
- **Consequences:** Notifications' Tier 1 (`notifications.process`) dedups before ever enqueueing a
  channel-specific send — the earliest point the duplicate can be caught.
- **Future Evolution:** N/A — permanent pattern, required for any new event whose side effect is
  user-visible and annoying to duplicate.
- **Cross References:** `.claude/event-catalog.md` §2.4, `.claude/bullmq-architecture.md` §10

### ADR-304 — Self-healing reconciliation jobs for every derived read model
- **Status:** Accepted — Design Only
- **Context:** Stage 1's `InMemoryEventBus` has no persistence — a lost event during a process
  restart permanently loses that side effect unless something else corrects it.
- **Decision:** Any consumer maintaining a derived/materialized table (Statistics' `standings`,
  `player_season_stats`, etc.) runs a scheduled BullMQ reconciliation job that recomputes the same
  read model directly from source tables, independent of the event stream (nightly).
- **Alternatives Considered:** Rely on Kafka's durability alone (Stage 3) — rejected as
  insufficient for Stage 1, where no durable bus exists yet, and as good practice even after Kafka
  arrives (a real safety net, not just a Stage-1 workaround).
- **Consequences:** A permanently-lost `game.finished` event self-heals by the next scheduled run
  rather than leaving standings wrong indefinitely.
- **Future Evolution:** Same job (`statistics.recompute`) also serves as this reconciliation pass,
  triggered both by events and on a schedule.
- **Cross References:** `.claude/event-catalog.md` §2.3, `.claude/bullmq-architecture.md` §9

### ADR-305 — BullMQ and the Event Bus are not redundant; each solves a different problem
- **Status:** Accepted — Design Only
- **Context:** Both look like "queue something for later" superficially.
- **Decision:** The Event Bus is cross-module, fire-and-forget broadcast — a publisher doesn't
  know or care who's listening. BullMQ is a single module's own reliable execution of its own
  work (explicit retry/backoff/concurrency). A module's event handler receives something off the
  bus and, if the resulting work needs retry semantics, enqueues a BullMQ job rather than doing it
  inline.
- **Alternatives Considered:** One unified queue/bus system — rejected; conflates "who else cares
  this happened" with "how do I reliably finish my own resulting work," two different concerns
  with different consistency needs.
- **Consequences:** 17 queues exist across 5 business modules plus `platform`, each with exactly
  one job shape and one retry policy (never a generic "do arbitrary work" queue).
- **Future Evolution:** N/A — permanent split.
- **Cross References:** `.claude/backend-architecture.md` §9, `.claude/bullmq-architecture.md` §1, §3

### ADR-306 — Deterministic job IDs for debounced, idempotent recomputation
- **Status:** Accepted — Design Only
- **Context:** Five games finishing within the same minute on a busy game day shouldn't trigger
  five separate standings recomputes for the same season.
- **Decision:** `statistics.recompute` is enqueued with a deterministic job ID
  (`recompute:{seasonId}`); BullMQ treats adding a job with an already-queued ID as a no-op, giving
  debouncing with zero custom logic.
- **Alternatives Considered:** A custom debounce/lock mechanism — rejected as unnecessary given
  BullMQ's native job-ID dedup already provides it.
- **Consequences:** Recomputation is inherently idempotent by construction (a pure function of
  `games`/`game_events`), consistent with `standings` already being "derived, never hand-edited."
- **Future Evolution:** N/A.
- **Cross References:** `.claude/bullmq-architecture.md` §9

---

## 4xx — Security & Authentication (design-only, extends the real Auth.js scaffold decision)

### ADR-401 — Auth.js for browser sessions; separate JWT (RS256) + refresh tokens for mobile/API
- **Status:** Accepted — Design Only (Auth.js itself is already chosen in `architecture.md`,
  scaffolded, not wired to real flows)
- **Context:** A browser session and a long-lived mobile/API credential have fundamentally
  different revocation and transport needs; using one mechanism for both means picking the wrong
  tradeoff for one of them.
- **Decision:** Browser: Auth.js session, Postgres source of truth with a Redis read-through cache
  (ADR-406). Mobile/API: short-lived (15 min) RS256 JWT access tokens + long-lived, rotating,
  reuse-detected refresh tokens (ADR-403). **RS256, not HS256** specifically because a symmetric
  secret would have to be distributed to every future extracted service capable of *verifying*
  tokens, and would therefore also be capable of *forging* them — RS256 keeps forging capability
  with Identity alone.
- **Alternatives Considered:** Pure JWT sessions for the browser too — rejected; no bandwidth-cost
  reason (unlike mobile) to give up instant revocation. Pure Postgres, no cache — rejected as
  avoidable load at scale.
- **Consequences:** Two auth mechanisms coexist deliberately, each fit to its client's actual
  constraints.
- **Future Evolution:** WebAuthn/passkeys as the recommended 2FA upgrade path (ADR-405) once
  Auth.js/browser support are ready.
- **Cross References:** `.claude/backend-architecture.md` §11, `.claude/security-architecture.md`
  §1, §7

### ADR-402 — Permission-string RBAC, enforced only at the middleware boundary
- **Status:** Accepted — Design Only
- **Context:** Hard-coded `if (role === "ADMIN")` checks scattered through business logic are hard
  to audit and easy to get subtly inconsistent.
- **Decision:** `resource:action` permission strings (`content:publish`, `roster:write`), granted
  to roles (`FAN`/`EDITOR`/`ADMIN`) via a `role_permissions` join table (data, not an enum, so a
  new role is an insert, not a migration+redeploy). One function, `can(context, action, resource)`,
  checked once at the API/middleware boundary before a module's function ever runs — never inside
  business logic.
- **Alternatives Considered:** Scattered role checks — rejected for the auditability/consistency
  reasons above.
- **Consequences:** `ADMIN` is not a bypass hatch — it simply holds every permission string, so a
  future partial-admin role is a one-line permission-set change.
- **Future Evolution:** Resource-instance-level ACLs (e.g. "this editor can only edit *this*
  team's news") deliberately not designed now — noted as a real future need, added as a schema
  extension, not a redesign, when actually needed.
- **Cross References:** `.claude/backend-architecture.md` §12, `.claude/security-architecture.md`
  §3–§4

### ADR-403 — Refresh token rotation with reuse detection
- **Status:** Accepted — Design Only
- **Context:** A standing, indefinitely-reusable refresh token is a high-value, long-lived target
  if leaked.
- **Decision:** Every `/v1/auth/refresh` call issues a new refresh token and immediately revokes
  the one just used (single-use). If a *revoked* token is presented again, that's treated as a
  strong theft signal: **every** refresh token for that user (all devices) is revoked, and a
  security-alert notification is triggered.
- **Alternatives Considered:** Long-lived, reusable refresh tokens — rejected; a leaked token would
  remain valid for its entire lifetime with no self-defense mechanism.
- **Consequences:** One row per device/session; "log out this device" revokes exactly one row.
- **Future Evolution:** N/A — this is the permanent behavioral policy on top of the already-designed
  `identity.refresh_tokens` schema shape.
- **Cross References:** `.claude/security-architecture.md` §2, `.claude/database-erd.md` §4

### ADR-404 — Argon2id for password hashing
- **Status:** Accepted — Design Only
- **Context:** Password hashing needs to be deliberately expensive to brute-force; not every hash
  function is designed for that.
- **Decision:** Argon2id (Password Hashing Competition winner, memory-hard, current OWASP
  default), with an optional application-level pepper as defense in depth beyond the per-password
  automatic salt.
- **Alternatives Considered:** bcrypt — rejected as not memory-hard, weaker against modern
  GPU/ASIC parallelization.
- **Consequences:** A stolen database dump alone (without the pepper, held only in app config) is
  insufficient to crack any password.
- **Future Evolution:** See ADR-408 — the *same* "hash it like a password" language was
  mistakenly applied to refresh tokens/API keys elsewhere in this design; that is flagged as an
  error to correct, not extended here.
- **Cross References:** `.claude/security-architecture.md` §8

### ADR-405 — TOTP 2FA, risk-based enforcement by role
- **Status:** Accepted — Design Only
- **Context:** A blanket 2FA requirement adds friction disproportionate to what a `FAN` account
  can actually do if compromised; no 2FA at all is unacceptable for `ADMIN`.
- **Decision:** TOTP (RFC 6238) as the primary second factor (no SMS, avoiding SIM-swap/SS7 risk
  entirely). Optional for `FAN`, strongly recommended for `EDITOR`, required for `ADMIN`.
- **Alternatives Considered:** SMS 2FA — rejected for well-documented interception weaknesses.
  Blanket-required 2FA — rejected as disproportionate friction for a read-mostly `FAN` account.
- **Consequences:** Backup/recovery codes are hashed at rest exactly like a password (ADR-404).
- **Future Evolution:** WebAuthn/passkeys as the recommended upgrade once library/user-base support
  is ready, TOTP remaining as fallback.
- **Cross References:** `.claude/security-architecture.md` §9

### ADR-406 — Redis as a read-through cache in front of Postgres-backed sessions, not a replacement
- **Status:** Accepted — Design Only
- **Context:** A session check on every request hitting Postgres directly doesn't scale; pure JWT
  sessions for the browser would sacrifice instant revocation for no real benefit (see ADR-401).
- **Decision:** Postgres (`identity.sessions`) remains the source of truth. Redis caches session
  data keyed by session token, TTL-matched to session expiry. Writes (login/logout/role change)
  update Postgres first, then invalidate/update the Redis entry.
- **Alternatives Considered:** Pure JWT, pure Postgres-only — both rejected per ADR-401's reasoning.
- **Consequences:** Deleting a Redis session key takes effect on the *next* request — the concrete
  advantage over a JWT, which stays valid until `exp` regardless.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/security-architecture.md` §7

### ADR-407 — Audit logs are immutable, admin-only, and deliberately never soft-deletable
- **Status:** Accepted — Design Only
- **Context:** A security control that could itself be hidden by the access level it's meant to
  hold accountable isn't a control.
- **Decision:** `analytics.audit_logs` has no `deleted_at` column at all — this is a deliberate
  exception to ADR-104's general soft-delete rule, not an oversight. Retention is handled by an
  explicit, logged archival policy instead.
- **Alternatives Considered:** Consistent soft-delete like every other table — explicitly rejected
  as defeating the table's purpose.
- **Consequences:** No `UPDATE`/`DELETE` API exists anywhere in the catalog for this resource, at
  any auth level, including `ADMIN`.
- **Future Evolution:** N/A — permanent invariant.
- **Cross References:** `.claude/database-erd.md` §11, `.claude/security-architecture.md` §14

### ADR-408 — [UNDER REVIEW] Refresh tokens/API keys specified as hashed "exactly like a password"
- **Status:** Under Review — flagged by independent security review, not yet corrected in source doc
- **Context:** `security-architecture.md` §2/§21 states refresh tokens and API keys are "hashed at
  rest, exactly like a password," reusing ADR-404's Argon2id guidance verbatim.
- **Decision (as currently written):** Argon2id for refresh tokens and API keys, same as
  passwords.
- **Why this is flagged:** A refresh token or API key is a high-entropy, machine-generated secret
  — Argon2id's deliberate slowness (the entire point for a low-entropy human password) is
  unnecessary overhead at best and a self-inflicted availability/DoS surface at worst once every
  refresh request pays that cost at volume.
- **Consequences if uncorrected:** Real performance/availability risk once implemented at
  production traffic.
- **Recommended Correction:** A fast cryptographic hash (SHA-256 is sufficient for an
  already-unguessable, high-entropy token), reserving Argon2id specifically for passwords.
- **Cross References:** `docs/security/09-security-architecture-review.md` finding M-5; see
  [KNOWN_ISSUES.md](./KNOWN_ISSUES.md#security) M-5

---

## 5xx — Storage & Media (design-only)

### ADR-501 — `MediaStorage` adapter interface; Cloudinary is the concrete Stage 1/Phase 5 choice
- **Status:** Accepted — Design Only
- **Context:** Locking in a specific storage vendor's SDK directly into Media's business logic
  would make a future vendor change a rewrite, not a swap.
- **Decision:** A `MediaStorage` interface (`upload`, `getSignedUploadUrl`, `delete`) is what
  Media's code depends on; Cloudinary is the Stage 1/Phase 5 concrete adapter, already committed
  to (env-var credentials, no live account until Phase 5, per the existing go-live plan). MinIO
  is the local-dev/self-hosted-parity adapter implementing the same interface.
- **Alternatives Considered:** Direct Cloudinary SDK calls throughout Media — rejected; makes a
  future vendor swap a rewrite. An S3-compatible adapter — documented as a viable alternative, not
  chosen.
- **Consequences:** Client uploads go direct-to-storage via signed URLs, never proxied through the
  Node process — large file bodies never transit the API layer.
- **Future Evolution:** Swapping the concrete adapter should not require changing the interface; if
  it does, that's a signal the interface itself needs revisiting.
- **Cross References:** `.claude/backend-architecture.md` §7, `.claude/future-services.md`,
  `.claude/security-architecture.md` §17

### ADR-502 — Four buckets by trust/lifecycle profile, not one bucket with folders
- **Status:** Accepted — Design Only
- **Context:** Bucket-level policy (public/private, replication, retention) is where the real
  security/operational boundary should live, not a folder convention inside one bucket.
- **Decision:** `azhl-media-raw` (never public), `azhl-media-public` (CDN-fronted), `azhl-media-private`
  (signed URL only), `azhl-backups` (never public).
- **Alternatives Considered:** One bucket with path-based separation — rejected; policy needs to
  be enforceable at the bucket level, not conventionally.
- **Consequences:** An asset physically moves buckets as it moves through raw → public/private →
  (on unpublish) back to private.
- **Future Evolution:** New per-module storage needs (e.g. a future Analytics export bucket) get
  their own bucket under the same discipline, not folded into Media's buckets.
- **Cross References:** `.claude/storage-architecture.md` §1

### ADR-503 — CDN fronts `azhl-media-public`; the storage origin is never directly public
- **Status:** Accepted — Design Only
- **Context:** `security-architecture.md` §17 says "buckets are private by default, no public-read
  bucket policy, ever" — but a published sports photo genuinely needs stable, non-expiring public
  URLs; requiring a fresh signed URL per view is both impractical and pointless (no secret to
  protect in an already-published photo).
- **Decision:** `azhl-media-public` still has no direct public-read bucket policy — the origin
  stays private, reachable only from the CDN (Origin Access Identity/Control pattern). The CDN
  itself is what's public.
- **Alternatives Considered:** A public-read bucket policy for this one bucket — rejected as
  contradicting the "no directly-exposed storage endpoint" property the private-by-default rule
  exists to guarantee.
- **Consequences:** Same security property as full-private, with the practical behavior published
  content actually needs.
- **Future Evolution:** Long `max-age`/`immutable` cache headers are safe and correct because
  ADR-504 guarantees content at a given path never changes.
- **Cross References:** `.claude/storage-architecture.md` §7, §10, `.claude/security-architecture.md` §17

### ADR-504 — Content versioning = new immutable object per replacement; bucket versioning is a safety net only
- **Status:** Accepted — Design Only
- **Context:** Two different things are both called "versioning" and conflating them is a common
  mistake.
- **Decision:** Every "replacement" (e.g. a new team logo) creates a new `media_assets` row and a
  new object at a new path — never an in-place overwrite. Native bucket versioning is *also*
  enabled on every bucket, purely as protection against an accidental overwrite/delete (an
  operator error or bug), since the application should never legitimately overwrite a key.
- **Alternatives Considered:** Rely on bucket versioning alone as the primary mechanism — rejected;
  doesn't give a stable, non-changing URL per asset the way content versioning does.
- **Consequences:** A URL, once issued, never silently starts pointing at different content — a
  content-integrity property, not just a nice-to-have. Any bucket-versioning history that surfaces
  is itself a signal something went wrong.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/storage-architecture.md` §6

### ADR-505 — WebP as the primary served image format; fixed variant set
- **Status:** Accepted — Design Only
- **Context:** Serving one original image at every size wastes bandwidth; supporting every
  conceivable format/size speculatively wastes processing and storage.
- **Decision:** WebP primary format (broad support, smaller than JPEG/PNG at equal quality); three
  fixed variants matching actual UI usage — `thumbnail`, `card`, `full`. A JPEG fallback is
  generated only if real traffic data ever shows a legacy-browser need. AVIF deferred until
  bandwidth/cost pressure justifies its higher encoding cost.
- **Alternatives Considered:** Generate every conceivable size/format upfront — rejected as waste
  with no current justification.
- **Consequences:** Adding a fourth variant later is cheap because the path scheme (ADR-502) and
  fixed-variant-set design already anticipate it.
- **Future Evolution:** AVIF revisited once real bandwidth/cost data justifies the tradeoff.
- **Cross References:** `.claude/storage-architecture.md` §4, `.claude/bullmq-architecture.md` §6

---

## 6xx — Observability (design-only)

### ADR-601 — Four distinct signal types, unified only by `correlationId`
- **Status:** Accepted — Design Only
- **Context:** Logs, metrics, traces, and errors each answer a different question; merging them
  into one system loses that distinction, but keeping them totally separate loses the ability to
  connect "why did this one request fail" across all four.
- **Decision:** Logs (what happened in this one request/job), Metrics (Prometheus — how is the
  system behaving in aggregate), Traces (OpenTelemetry — where did the time go across one
  request), Errors (Sentry-style — what broke, how many affected) — four separate tools, one
  shared `correlationId` threaded through every log line, trace span, job, and error report.
  **`correlationId` *is* the trace ID**, not a parallel identifier.
- **Alternatives Considered:** One unified observability tool for everything — rejected; each
  signal type has a genuinely different access pattern and tool that's actually good at it.
- **Consequences:** "Why did this fail" is answerable by looking up one ID in any of the four
  systems, not by manually correlating timestamps across all of them.
- **Future Evolution:** At Stage 3 (Kafka), the same `correlationId`/trace context propagates
  through Kafka message headers (W3C Trace Context) rather than needing a new scheme.
- **Cross References:** `.claude/observability-architecture.md` §1, §3, §7, §13

### ADR-602 — `/metrics` never publicly reachable
- **Status:** Accepted — Design Only
- **Context:** A public metrics endpoint would leak internal topology, request volume, and
  business-activity counts (e.g. inferable real-time traffic during a live game).
- **Decision:** Every deployable exposes its own `/metrics` in Prometheus format, scraped only
  from Prometheus's own network position (internal network/IP allowlist/scrape-auth) — never
  exposed the way the public API is.
- **Alternatives Considered:** Public `/metrics` with generic data only — rejected; even
  request-volume alone is a meaningful information leak for this product.
- **Consequences:** Enforcement mechanism (network ACL vs. auth token vs. mTLS) is left as an
  implementation-time choice — flagged as an open item, see
  [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) L-5.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/observability-architecture.md` §5

### ADR-603 — Three-tier alerting; noisy alerts get demoted, not silenced
- **Status:** Accepted — Design Only
- **Context:** A threshold that pages too often for a condition that turns out to self-heal
  produces alert fatigue, which is itself a failure mode of the alerting system.
- **Decision:** Page (wake someone up) / Ticket (business hours) / Log-only (no notification) —
  one policy referenced by every domain that needs to alert, rather than each domain inventing its
  own. A noisy alert is demoted a tier, never left paging "just in case."
- **Alternatives Considered:** Uniform paging for anything error-adjacent — rejected as guaranteed
  alert fatigue.
- **Consequences:** Every page includes a representative failing request's `correlationId`/trace
  link so the responder's first action isn't reproducing the problem from scratch.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/observability-architecture.md` §10

---

## 7xx — Frontend & Design System

### ADR-701 — Dark-mode-only in Phase 1, via semantic Tailwind tokens
- **Status:** Accepted — Implemented
- **Context:** Hardcoded hex values in components would make a future light theme a rewrite.
- **Decision:** Every color is a semantic Tailwind theme variable (`bg-surface-base`,
  `text-foreground-primary`, etc.), never a raw hex value in component code. Light mode is a
  documented future toggle (a token-swap), not built now.
- **Alternatives Considered:** Ship light mode in parallel from the start — rejected as
  unnecessary scope for Phase 1's actual requirement.
- **Consequences:** A future light theme is a `[data-theme="light"]` token-remap, not a rewrite.
- **Future Evolution:** Light theme addition, phase TBD.
- **Cross References:** `.claude/design-system.md`

### ADR-702 — Team brand colors are a non-text accent only, never a text/background pairing
- **Status:** Accepted — Implemented (rule) / partially exercised by current components
- **Context:** `Team.colorPrimary`/`colorSecondary`/`colorAccent` are admin-authored data, not
  designed tokens — they cannot be assumed to have safe WCAG contrast against `surface-base` or
  against each other.
- **Decision:** Team color renders only as a thin border stripe, underline, badge dot, or (the one
  exception) a logo-container fill behind the logo itself. Text always uses the fixed
  `foreground-*`/`surface-*` token pairs — never "team color text on surface" or "surface text on
  team color fill."
- **Alternatives Considered:** Runtime contrast computation against arbitrary team colors —
  rejected as unpredictable and unverifiable at design time.
- **Consequences:** Every text/background pairing in the product stays within the fixed,
  pre-verified token set regardless of what colors admin-entered team data contains.
- **Future Evolution:** N/A — permanent rule as more team-colored surfaces are added.
- **Cross References:** `.claude/component-library.md`

### ADR-703 — Two motion tokens only; `prefers-reduced-motion` is "don't animate," not "animate faster"
- **Status:** Accepted — Implemented
- **Context:** Ungoverned per-component animation durations/curves produce visual inconsistency;
  reduced-motion is sometimes wrongly implemented as a shortened animation rather than none.
- **Decision:** `ease-out-quick` (150ms, hover/press/focus) and `ease-out-cinematic` (400–600ms,
  entrances/reveals) are the only two curves used anywhere. `useReducedMotion` gates every
  animated interaction; when true, content reaches its final state with `initial={false}` — no
  animation plays at all, not a faster one.
- **Alternatives Considered:** Per-component custom durations — rejected for consistency.
  Shortened animations under reduced-motion — rejected as still triggering vestibular
  discomfort for the users the setting exists to protect.
- **Consequences:** Stagger delays are capped (40–60ms/item, ≤600ms total) regardless of list
  length.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/animation-guidelines.md`, `.claude/design-system.md`

### ADR-704 — Glassmorphism restricted to two surfaces only (nav bar, score overlays)
- **Status:** Accepted — Implemented
- **Context:** `backdrop-filter: blur()` is one of the most expensive properties a browser can
  composite; applied to a large, frequently-scrolled surface it's a guaranteed frame-budget
  violation, and blurred/semi-transparent backgrounds behind dense text fail contrast checks
  unpredictably as content scrolls behind them.
- **Decision:** Glassmorphism (translucent fill + backdrop-blur) is used only on the sticky nav bar
  and score overlays (small, mostly-static elements). Forbidden on article bodies, standings
  tables, schedule lists, stat grids — solid `surface-raised`/`surface-overlay` fills instead.
- **Alternatives Considered:** Broader glassmorphism use for visual polish — rejected on both
  performance and legibility grounds, treated as an absolute rule, not a per-component judgment
  call.
- **Consequences:** Every new large content surface defaults to a solid fill without needing a
  case-by-case decision.
- **Future Evolution:** N/A.
- **Cross References:** `.claude/design-system.md`, `.claude/animation-guidelines.md`

### ADR-705 — `packages/ui` stays a near-empty scaffold until a second real app exists
- **Status:** Accepted — Implemented
- **Context:** Promoting a component into a shared package before there's a second consumer
  produces an abstraction shaped by guesswork.
- **Decision:** A component moves from `apps/web/src/components/*` to `packages/ui` only once 2+
  apps genuinely consume it. Today `packages/ui` holds exactly one component (`Button`), kept only
  as a pattern example.
- **Alternatives Considered:** Pre-emptively promote `StandingsTable` or other "reusable-looking"
  components — explicitly rejected; `apps/admin`/`apps/mobile-api` are scaffolds with no rendering
  surface yet, so there is no second consumer to justify it.
- **Consequences:** When a component finally is promoted, the app-local copy is deleted — never
  two implementations maintained in parallel.
- **Future Evolution:** Applies again the next time `apps/admin` (Phase 4) needs a component
  `apps/web` already has.
- **Cross References:** `.claude/component-library.md`, `.claude/engineering-principles.md`

### ADR-706 — Deterministic, seeded mock data for UI sections the schema doesn't support yet
- **Status:** Accepted — Implemented (uncommitted at time of writing; see
  [KNOWN_ISSUES.md](./KNOWN_ISSUES.md))
- **Context:** Approved mockups for Teams/Players/Stats pages include sections (full player stats,
  play-by-play, lineups, partners, coach/founded info) that Phase 1's real schema has no model
  for, and building the real schema for them is out of Phase 1/2 scope per the roadmap as
  currently written.
- **Decision:** `apps/web/src/lib/mock/*` holds deterministic, ID-seeded (never `Math.random()`)
  placeholder data for exactly these sections, with a hard firewall: never imported by
  `lib/server/services/*` or any `app/api/**` route.
- **Alternatives Considered:** Block these UI sections entirely until the real schema exists —
  rejected in practice by whoever built this (a Product/Frontend call, not documented as such);
  hardcode static placeholder content inline per component — rejected as harder to keep consistent
  across pages than a shared, deterministic generator.
- **Consequences:** Real Prisma-backed services (`player.service.ts`, `team.service.ts`) and
  schema-less mock data now coexist in the same page renders, which is architecturally sound
  (the firewall holds) but represents building ahead of the documented roadmap phase — flagged
  explicitly in [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).
- **Future Evolution:** Each mock generator is replaced by a real Prisma model + service once its
  roadmap phase arrives; the consuming component's props are designed not to need to change when
  that happens.
- **Cross References:** `apps/web/src/lib/mock/README.md`, [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

---

## 8xx — Process & DevOps

### ADR-801 — Conventional Commits enforced locally via Husky + commitlint, even with no remote
- **Status:** Accepted — Implemented
- **Context:** Waiting for a remote/CI to exist before enforcing commit hygiene means history is
  already messy by the time it matters.
- **Decision:** `commit-msg` hook + `commitlint.config.js` enforce `<type>(<scope>): <summary>` on
  every local commit, scope restricted to the monorepo's actual apps/packages plus `repo`/`ci`/`docs`.
- **Alternatives Considered:** Defer enforcement until CI exists — rejected; the entire value is
  clean history *before* a remote exists, not retrofitted after.
- **Consequences:** Both real commits in the repo already follow this format.
- **Future Evolution:** Unchanged once a remote exists — CI additionally *runs against* this
  history rather than establishing a new requirement.
- **Cross References:** `.claude/github-strategy.md`

### ADR-802 — `.env` files live per-package, never at the monorepo root
- **Status:** Accepted — Implemented (supersedes an earlier, broken root-`.env` approach)
- **Context:** Prisma and Next.js each auto-load `.env` from their own package directory, not the
  monorepo root — a root-only `.env` silently never reached either tool outside a manually-sourced
  shell.
- **Decision:** Real (gitignored) env files live at `apps/web/.env` and `packages/database/.env`.
  Root `.env.example` is documentation of variable names only, never a real value source.
- **Alternatives Considered:** A manually-sourced root `.env` with shell tooling to distribute it
  — rejected as fragile and exactly what caused the original bug.
- **Consequences:** Also required dropping the `dotenv-cli` wrapper from `packages/database`'s
  Prisma scripts, since it would additionally have broken on Vercel/CI where no `.env` file exists
  at all (env vars come from the platform there).
- **Future Evolution:** N/A — this is the corrected, permanent shape.
- **Cross References:** commit `bc2f2dc`, [PROJECT_HISTORY.md](./PROJECT_HISTORY.md)

### ADR-803 — `eslint-plugin-next`'s shared config excludes generated `next-env.d.ts`
- **Status:** Accepted — Implemented
- **Context:** `next-env.d.ts` legitimately uses triple-slash references and fails
  `@typescript-eslint/triple-slash-reference` once it's generated after a first build — a false
  positive against generated code, not a real lint violation.
- **Decision:** The shared `packages/config/eslint/nextjs.js` config excludes this generated file.
- **Alternatives Considered:** Suppress the rule per-file with an inline comment — rejected as
  something every new app in the monorepo would have to remember to repeat.
- **Consequences:** Fixed once, centrally, for every current and future app in the monorepo.
- **Future Evolution:** N/A.
- **Cross References:** commit `bc2f2dc`, [PROJECT_HISTORY.md](./PROJECT_HISTORY.md)
