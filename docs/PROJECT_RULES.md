# PROJECT_RULES.md — AZHL Engineering Rules That Must Never Be Violated

This is the enforceable checklist form of AZHL's non-negotiable engineering rules. Each rule below
is a compressed pointer to its full rationale in [DECISIONS.md](./DECISIONS.md) — this document
intentionally does not re-explain *why* in depth; it exists so a rule can be checked in seconds
during review. If a rule and `.claude/` ever disagree, `.claude/` (or the code, if the doc is
stale) wins — see `.claude/CLAUDE.md`'s drift policy — and this file should be corrected in the
same change.

Rules are grouped by where they apply. **"Implemented"** rules govern code that exists today and
are checked by the AI Code Reviewer agent on every non-trivial diff. **"Design-only"** rules govern
the target architecture in `.claude/backend-architecture.md` and its siblings — they don't apply to
any code that exists yet, but apply from the first line of code written against that design.

---

## Universal rules (apply everywhere, always)

### R-001 — Documentation before invention
Before designing a data model, API route, component, file layout, or workflow, check whether
`.claude/` already specifies it. If it does, follow it exactly. If it's genuinely silent, extend
the nearest existing pattern and update the doc — never start a parallel convention.
- **Why it exists:** without this rule, the same architectural question gets re-decided
  differently every session, and the codebase accumulates competing conventions for the same
  problem.
- **What breaks if violated:** two different "correct" ways to do the same thing exist
  simultaneously; every future contributor has to guess which one is current.
- **Cross Reference:** `.claude/MASTER_SYSTEM_PROMPT.md` rule 1

### R-002 — Build only what the current roadmap phase calls for
Every non-trivial task must trace to a bullet in the current phase of
[IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md). No speculative functionality, no
half-finished features shipped "for later," no business logic in apps/packages intentionally
scaffold-only for the current phase.
- **Why it exists:** speculative work is shaped by guesses about requirements that don't exist
  yet, and guesses are expensive to unwind once real requirements arrive and disagree with them.
- **What breaks if violated:** dead code paths that look finished but aren't get inherited by the
  next person as an invisible gap; scope silently expands with no acceptance criteria behind it.
  See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for the one place this has already happened (Phase 2/3
  frontend built ahead of the documented roadmap).
- **Cross Reference:** ADR-004, `.claude/MASTER_SYSTEM_PROMPT.md` rule 5

### R-003 — State tradeoffs, then recommend; don't silently pick
When multiple valid solutions exist, name the realistic options, state their tradeoffs against
scalability/maintainability/accessibility/performance, and recommend one with a reason.
- **Why it exists:** a silently-made non-obvious call can't be reviewed or overridden by someone
  who would have chosen differently for a reason they never got to state.
- **What breaks if violated:** architectural drift accumulates from individually-reasonable but
  collectively-inconsistent unilateral choices.
- **Cross Reference:** `.claude/MASTER_SYSTEM_PROMPT.md` rule 3

### R-004 — Trust internal guarantees; validate only at real boundaries
Internal, typed callers (a service calling another service, a component receiving a DTO prop) are
not re-validated defensively. Validation happens only where untrusted input actually enters the
system.
- **Why it exists:** validating "just in case" at every layer adds noise without adding safety and
  obscures where the real trust boundary is — which matters most exactly when something goes
  wrong there.
- **What breaks if violated:** the actual trust boundary becomes impossible to identify during an
  incident, because validation logic is smeared across every layer instead of concentrated where
  it matters.
- **Cross Reference:** ADR-005

---

## Data & backend rules (implemented)

### R-101 — Only services may access Prisma
No component, page, or route handler queries Prisma directly. `lib/server/services/*` is the only
code allowed to import `@azhl/database`.
- **Why it exists:** this is the single source-of-truth guarantee the whole services→RSC/API
  pattern depends on — one implementation, two consumers (RSC pages, API route handlers).
- **What breaks if violated:** business logic duplicates between a page and a route handler, and
  the two silently drift apart the first time one is changed without the other.
- **Cross Reference:** ADR-002, `.claude/coding-standards.md`

### R-102 — Pages never contain business logic
Filtering, sorting, joining, or derived-field computation never lives in a Server Component page
body. A page renders data a service already shaped.
- **Why it exists:** logic in a page is invisible to the route handler that needs the same logic
  for the API contract, and vice versa.
- **What breaks if violated:** the API and the rendered page silently disagree on filtering/sort
  behavior for the same underlying data.
- **Cross Reference:** ADR-002

### R-103 — API routes only adapt requests; they never contain business logic
A route handler under `app/api/v1/*` parses/validates the request, calls a service function, and
shapes the result into `ApiResponse<T>`. Nothing else. A handler body over ~15–20 lines is a signal
logic leaked in.
- **Why it exists:** same reasoning as R-101/R-102 — one implementation, not a fork.
- **What breaks if violated:** the RSC-rendered page and the JSON API return subtly different
  results for what should be identical underlying logic.
- **Cross Reference:** ADR-204, `.claude/api-guidelines.md`

### R-104 — Mock data never enters production services or API routes
Nothing under `apps/web/src/lib/mock/*` is ever imported by `lib/server/services/*` or any
`app/api/**` route handler.
- **Why it exists:** mock data exists only to unblock UI for schema-not-built-yet sections; if it
  ever leaked into a real service or API response, placeholder data would silently ship as if it
  were real.
- **What breaks if violated:** an API consumer (including a future `apps/mobile-api`) receives
  fabricated data with no way to distinguish it from real data.
- **Cross Reference:** ADR-706, `apps/web/src/lib/mock/README.md`

### R-105 — Mock data generators must be deterministic, never `Math.random()` per call
Every mock generator is seeded from a real, stable ID (player id, game id, team slug).
- **Why it exists:** non-deterministic mock data causes server/client hydration mismatches and
  makes a page look different on every visit, which reads as a bug even though it's placeholder
  data by design.
- **What breaks if violated:** React hydration errors in dev/prod; a QA engineer can't reliably
  reproduce what a page showed on a prior visit.
- **Cross Reference:** ADR-706

### R-106 — Never hand-edit a generated Prisma migration
A wrong migration is fixed by changing `schema.prisma` and re-running `migrate dev` to generate a
new, corrected migration — never by editing already-generated SQL.
- **Why it exists:** hand-edited migrations are the single most common cause of dev/prod schema
  drift, because the edit only exists on whichever machine made it.
- **What breaks if violated:** a production migration run applies different SQL than what a
  developer tested locally.
- **Cross Reference:** `.claude/database-guidelines.md`

### R-107 — Every seed model upserts on its natural unique constraint
New seed data follows `packages/database/prisma/seed.ts`'s existing pattern: pick the model's real
unique constraint, `upsert` on it — never `create`-only guarded by a manual existence check.
- **Why it exists:** guarantees the seed script stays safe to run repeatedly without duplicating
  rows or throwing on a second run.
- **What breaks if violated:** re-running seed against a populated database either errors or
  duplicates data.
- **Cross Reference:** ADR-105

### R-108 — Every index must serve a real, known query pattern
No speculative "might need it later" indexing. Before adding a new index, check whether an
existing compound index already covers the query via its leading column(s).
- **Why it exists:** redundant indexes cost write performance and storage for no read benefit.
- **What breaks if violated:** write throughput degrades on high-volume tables (especially the
  `bigint identity`-keyed append-only tables, ADR-103) for indexes nothing actually queries.
- **Cross Reference:** `.claude/database-guidelines.md`

---

## Environment & secrets rules (implemented)

### R-109 — Environment variables stay package-local
Real `.env` files live at `apps/web/.env` and `packages/database/.env` — never a root-only
`.env`. `.env.example` at the root documents variable *names* only.
- **Why it exists:** Prisma and Next.js each auto-load `.env` from their own package directory,
  not the monorepo root; a root-only file silently never reaches either tool outside a
  manually-sourced shell. This was a real, already-fixed production bug.
- **What breaks if violated:** `prisma migrate`/`prisma generate` and `next dev`/`next build`
  silently fail to see required environment variables, exactly as happened before commit `bc2f2dc`.
- **Cross Reference:** ADR-802, [PROJECT_HISTORY.md](./PROJECT_HISTORY.md)

### R-110 — Secrets are never committed, ever
Real credential values live only in the hosting platform's secret store (Vercel). `.env.example`
never contains a real value, only a placeholder.
- **Why it exists:** a committed secret is permanently in git history even after being removed in
  a later commit.
- **What breaks if violated:** credential leak requiring full rotation, not just a file deletion.
- **Cross Reference:** `.claude/future-services.md`, `.claude/security-architecture.md` §15

---

## Frontend & design rules (implemented)

### R-111 — No component performs implicit data fetching
No component in any tier (`ui/`, `layout/`, `league/`) calls a service function or `fetch`. Data
arrives via props from the Server Component page that renders it.
- **Why it exists:** this is R-101's rule restated at the component boundary — a component that
  fetches its own data is a component that can bypass the service layer.
- **What breaks if violated:** a component becomes untestable in isolation and unusable in a
  future context (e.g. `apps/admin`) with a different data source for the same shape.
- **Cross Reference:** `.claude/component-library.md`

### R-112 — Team brand color is never used as a text/background pairing
Team colors (`colorPrimary`/`colorSecondary`/`colorAccent`) render only as a non-text accent
(border stripe, underline, badge dot, or a logo container's fill behind the logo itself) — never
as computed text-on-color or color-on-text.
- **Why it exists:** team colors are admin-authored data with no guaranteed WCAG contrast against
  `surface-base` or against each other; computing contrast at runtime against arbitrary values
  can't be verified at design time.
- **What breaks if violated:** a team with a light brand color renders illegible text for any user,
  discovered only after that specific team's data is entered.
- **Cross Reference:** ADR-702

### R-113 — No hardcoded hex colors in component code
Every color reference is a semantic Tailwind theme token (`bg-surface-base`,
`text-foreground-primary`), never a raw hex value.
- **Why it exists:** a future light theme (already a documented intent) needs to be a token-remap,
  not a component-by-component rewrite.
- **What breaks if violated:** a light theme (or any palette change) requires hunting down every
  inlined hex value across the codebase instead of changing one token map.
- **Cross Reference:** ADR-701

### R-114 — Animate only `transform` and `opacity`; every animation is gated by `prefers-reduced-motion`
Never animate `width`/`height`/`top`/`left`/`margin`/`padding`. Every animated interaction checks
`useReducedMotion` and, when true, skips the animation entirely (`initial={false}`), never plays a
shortened version.
- **Why it exists:** only `transform`/`opacity` animate on the compositor thread without triggering
  layout/paint — anything else risks missing the 60fps budget. Reduced-motion is an accessibility
  setting for vestibular disorders, not a "make it faster" preference — a shortened animation still
  triggers the discomfort it exists to prevent.
- **What breaks if violated:** janky, frame-dropping "cinematic" motion (worse than no motion,
  since motion is a stated product pillar); a user who explicitly requested no motion still gets
  motion.
- **Cross Reference:** ADR-703, `.claude/animation-guidelines.md`

### R-115 — Glassmorphism only on the nav bar and score overlays
`backdrop-filter`/translucent-fill treatment never appears on article bodies, tables, schedule
lists, or stat grids — solid `surface-raised`/`surface-overlay` fills instead.
- **Why it exists:** `backdrop-filter: blur()` is one of the most expensive properties to
  composite over a large, scrolling surface, and blurred/semi-transparent backgrounds behind dense
  text fail contrast checks unpredictably as content scrolls behind them.
- **What breaks if violated:** a real frame-budget violation on exactly the data-dense pages that
  most need to stay fast, plus unpredictable text-contrast failures.
- **Cross Reference:** ADR-704

### R-116 — A component is promoted to `packages/ui` only once 2+ apps consume it
Never promote a component because it "feels reusable." When a component is promoted, delete the
app-local copy — never maintain two implementations.
- **Why it exists:** an abstraction designed against a single real caller is shaped by guesswork,
  and guesses about reuse are usually wrong in ways expensive to unwind.
- **What breaks if violated:** `packages/ui` accumulates a generalized, prop-heavy API nobody but
  its single caller actually exercises, and diverges from `apps/web`'s actual local copy over time.
- **Cross Reference:** ADR-705

---

## Design-only rules (govern the target backend architecture — not built yet)

### R-201 — A module's Prisma models are queried only by that module's own repositories
No other module, app, or route handler imports another module's repository or Prisma client
directly, once modules exist.
- **Why it exists:** this is R-101 scoped down to "this one module's own services" — the same
  single-source-of-truth guarantee, generalized to a multi-module backend.
- **What breaks if violated:** the entire point of module boundaries (independent extractability,
  ADR-109) is defeated the first time one module reaches into another's tables directly.
- **Cross Reference:** ADR-203 rule 1, `.claude/backend-architecture.md` §3

### R-202 — No direct module-to-module business logic calls for side effects
A module never calls another module's command handlers to trigger a side effect in that module.
Anything that isn't "I need this one fact right now to complete my own request" goes through the
Event Bus.
- **Why it exists:** direct side-effect calls between modules recreate the exact tight coupling the
  module architecture exists to avoid — a module that calls another's handlers directly can't be
  extracted without also extracting (or reimplementing) the callee.
- **What breaks if violated:** Game Operations would need to know Statistics exists just to
  trigger a recompute — adding a fourth subscriber later would require changing Game Operations'
  code instead of purely adding a new listener.
- **Cross Reference:** ADR-203 rule 3, `.claude/backend-architecture.md` §3, §4

### R-203 — No foreign keys across module (Postgres schema) boundaries
A `references` clause only ever points within the same schema. Cross-module relationships are
plain ID columns, resolved via a live call or an event payload.
- **Why it exists:** this is what makes "one database today, separate databases later" actually
  true instead of aspirational — Postgres itself refuses a cross-schema FK once schemas are
  physically separated.
- **What breaks if violated:** a future per-module database extraction becomes a data-modeling
  project instead of a `pg_dump`/`pg_restore`.
- **Cross Reference:** ADR-108, ADR-109

### R-204 — Every module's errors extend the shared base-class hierarchy; no internals leak across a boundary
No raw Prisma error object, stack trace, or internal exception message ever crosses a module
boundary or the API boundary.
- **Why it exists:** internal error text routinely leaks schema/implementation details useful to
  an attacker, and inconsistent error shapes make the API-layer error-mapping step unreliable.
- **What breaks if violated:** an API consumer receives a raw database error message instead of a
  stable `ApiError` shape; internal schema details become visible to any caller who triggers an
  error.
- **Cross Reference:** ADR-207

### R-205 — Authorization checks happen only at the API/middleware boundary, never inside business logic
A module's function assumes it's already been authorized to run by the time it's called; `can()`
checks never appear inside a module's own business logic.
- **Why it exists:** scattering authorization checks through business logic makes them impossible
  to audit exhaustively and easy to miss on a new code path.
- **What breaks if violated:** a new endpoint or internal call path ships without an authorization
  check because there's no single place review can look to confirm one exists.
- **Cross Reference:** ADR-402, `.claude/backend-architecture.md` §12

### R-206 — Modules never verify credentials themselves
A module trusts the `AuthContext` middleware already resolved, exactly as it trusts already-typed
inputs (R-004). Authentication is a boundary concern.
- **Why it exists:** re-implementing credential verification inside business logic multiplies the
  places a verification bug can hide.
- **What breaks if violated:** inconsistent authentication behavior between two call paths that
  should behave identically.
- **Cross Reference:** ADR-401, `.claude/backend-architecture.md` §11

### R-207 — Publish a domain event only after the write that makes it true has committed
Never publish before the underlying database write commits.
- **Why it exists:** this is what makes nearly every event in the catalog "durable-independent" —
  losing the event only delays/loses a side effect, never the underlying fact, because the fact is
  already durable in Postgres by the time the event exists.
- **What breaks if violated:** an event could announce a fact that then fails to commit, and a
  downstream consumer (Notifications, Statistics) acts on something that never actually happened.
- **Cross Reference:** ADR-301, `.claude/event-catalog.md` §2.5

### R-208 — Every event consumer that maintains a derived read model needs a scheduled reconciliation job
Any table rebuilt from published events (Statistics' `standings`, `player_season_stats`, etc.) also
has a scheduled job that recomputes it directly from source tables, independent of the event
stream.
- **Why it exists:** Stage 1's `InMemoryEventBus` has no persistence — a lost event during a
  process restart is otherwise permanently lost.
- **What breaks if violated:** a dropped event silently and permanently corrupts a derived table
  (e.g. standings staying wrong indefinitely after a missed `game.finished`).
- **Cross Reference:** ADR-304

### R-209 — Refresh tokens rotate on every use; reuse of a revoked token revokes every token for that user
Never issue a reusable, standing refresh token.
- **Why it exists:** rotation-with-reuse-detection is the single highest-value refresh-token
  security behavior — it turns a leaked-token scenario from "silently exploitable indefinitely"
  into "immediately detected and contained."
- **What breaks if violated:** a stolen refresh token remains valid and undetected for its entire
  lifetime (30–90 days).
- **Cross Reference:** ADR-403

### R-210 — Audit logs (`analytics.audit_logs`) are never soft-deletable and have no write API at any auth level
No `PATCH`/`DELETE` exists for this resource anywhere, including for `ADMIN`.
- **Why it exists:** a security control that could be hidden or altered by the access level it's
  meant to hold accountable isn't a control.
- **What breaks if violated:** an actor with sufficient privilege could erase evidence of their own
  privileged actions.
- **Cross Reference:** ADR-407

### R-211 — Every queue has exactly one job shape and one retry/priority policy
Never a generic "do arbitrary work" queue with per-job-type branching inside a single handler.
- **Why it exists:** mixed job shapes in one queue hide different reliability needs behind one
  policy and make per-queue monitoring (depth/failure-rate) meaningless.
- **What breaks if violated:** a queue's failure-rate graph stops meaning any one specific thing,
  and an appropriate retry policy for one job type becomes wrong for another sharing the queue.
- **Cross Reference:** ADR-305, `.claude/bullmq-architecture.md` §3

### R-212 — Nothing auto-replays from a Dead Letter Queue
A DLQ job is inert until a human investigates the root cause and deliberately triggers a replay,
logged like any other privileged action.
- **Why it exists:** auto-replay re-runs the same failure in a loop for anything but a transient
  issue — and a transient issue would already have been resolved by the queue's own retry policy
  before ever reaching the DLQ.
- **What breaks if violated:** a poison message (a permanently-broken payload) consumes worker
  capacity in an infinite retry loop instead of surfacing for a human to fix.
- **Cross Reference:** `.claude/bullmq-architecture.md` §5, §15
