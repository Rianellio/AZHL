# KNOWN_ISSUES.md — AZHL Open Issues Register

Every unresolved issue in AZHL, verified against the actual repository state (not assumed from
documentation) as of this document's creation. Issues are separated by domain; within a domain,
listed most-severe first. Security findings are carried over from the independent architecture
review at `docs/security/09-security-architecture-review.md` — that document is the canonical
source for full technical detail on each; this register exists to put them alongside every other
kind of open issue in one place, per [PROJECT_STATE.md](./PROJECT_STATE.md)'s "technical debt"
summary.

**Priority scale:** Critical (blocks production/data integrity) · High (should resolve before the
next phase gate) · Medium (should resolve, not urgent) · Low (worth tracking, no immediate cost).

---

## Architecture

### AZ-A1 — Frontend built ahead of the documented roadmap phase
- **Description:** `roadmap.md` gates Team pages/rosters to Phase 2 and Stats/History to Phase 3,
  each with stated prerequisites (extended `Team`/`Player` schema; a stats data model). The
  current working tree already contains `/teams`, `/teams/[slug]`, `/players`, `/players/[id]`,
  `/stats`, and `/league` pages, partly backed by real services
  (`player.service.ts`, `team.service.ts`) and partly by a deliberate mock-data escape hatch
  (`lib/mock/*`, see ADR-706 in [DECISIONS.md](./DECISIONS.md)) for sections the schema doesn't
  support yet.
- **Priority:** High
- **Impact:** The roadmap is no longer an accurate description of what's built, which undermines
  its function as the phase-gating source of truth (`.claude/MASTER_SYSTEM_PROMPT.md` rule 5,
  [PROJECT_RULES.md](./PROJECT_RULES.md) R-002). Not a correctness bug — the architectural
  firewall (R-104) holds — but a process/documentation integrity issue.
- **Recommended Solution:** A Product Manager pass to either (a) formally pull Phase 2/3's "Ships"
  bullets forward with updated acceptance criteria, or (b) explicitly flag this work as
  intentionally ahead-of-schedule and gate its *data* completion (replacing mock sections with
  real schema/services) to the original phase boundaries.
- **Current Status:** Open, uncommitted. See [PROJECT_HISTORY.md](./PROJECT_HISTORY.md) for the
  full timeline of when this work was done.

### AZ-A2 — No compensating control for cross-schema reference integrity (design-only)
- **Description:** The target module architecture forbids foreign keys across a Postgres schema
  boundary (ADR-108) — a deliberate, well-reasoned tradeoff for eventual per-module database
  extraction. No document specifies any compensating control (a scheduled orphan-detection job, a
  consistency-check reconciliation pass) for the resulting risk.
- **Priority:** High (blocking before real inter-module implementation begins)
- **Impact:** An application bug or a race condition between two modules' writes can silently
  create e.g. `games.home_team_id` pointing at a deleted/nonexistent team, undetectable by the
  database or the application as currently designed.
- **Recommended Solution:** Add a scheduled `platform.maintenance.*`-family consistency-check job
  (already the right home per `bullmq-architecture.md` §12) that periodically verifies
  cross-schema ID references still resolve, and alerts on drift.
- **Current Status:** Open — security review finding H-6, not yet incorporated into
  `backend-architecture.md`/`database-erd.md`.

### AZ-A3 — Player/coach/staff roster history is not season-scoped (design-only, self-flagged)
- **Description:** `database-erd.md`'s own `players`/`coaches`/`staff_members` design notes that a
  `team_id` pointing only at a player's *current* team loses history the moment a player is
  transferred — a former team's roster page can no longer show "who played here in 2026."
- **Priority:** Medium
- **Impact:** Historical roster pages would be wrong (showing only current affiliations) once
  Phase 2/3 implements transfers, unless corrected before that ships.
- **Recommended Solution:** A season-scoped roster-history table (`team_id` + `season_id` +
  `player_id`), already named as the correct fix in the source document — deliberately deferred
  there, not designed further, per its own scope discipline.
- **Current Status:** Open, explicitly deferred by design (see ADR-106 in
  [DECISIONS.md](./DECISIONS.md)) — not a gap requiring new discovery, just not yet built.

---

## Frontend

### AZ-F1 — Stray non-brand image asset in `public/logos/`
- **Description:** `apps/web/public/logos/WhatsApp Image 2026-07-25 at 15.56.29.jpeg` sits
  alongside the real team logo assets (`buta.png`, `gala.png`, `qartal.png`, `ulduz.png`).
- **Priority:** Low
- **Impact:** Cosmetic/hygiene only — an obviously-misnamed file in a public asset directory,
  likely meant to be renamed to a real team-logo filename or removed before commit.
- **Recommended Solution:** Rename to its intended team-logo filename, or delete if superseded.
- **Current Status:** Open, uncommitted.

### AZ-F2 — Zero automated test coverage anywhere in the repository
- **Description:** `coding-standards.md` mandates Vitest coverage for `lib/server/services/*`
  (priority: standings/schedule domain logic), React Testing Library coverage for non-visual
  component behavior, and Playwright E2E coverage for the critical path (home → standings →
  schedule → a game → news → an article) "before Phase 1 is considered done." A repository search
  found **no test files, no Vitest/Playwright/RTL dependency, and no test configuration anywhere**
  in `apps/web`, `packages/database`, or the root `package.json`.
- **Priority:** High
- **Impact:** Phase 1, per its own owning document's definition of done, is not actually complete.
  Standings/schedule logic — flagged by `engineering-principles.md` itself as "easy to get subtly
  wrong" — has zero regression protection.
- **Recommended Solution:** QA Engineer pass to stand up Vitest for the five existing services
  first (highest-value, cheapest to write per `engineering-principles.md`'s stated priority
  order), then RTL for `StandingsTable`/`ScoreCard` conditional-rendering branches, then a single
  Playwright critical-path test before Phase 1 is marked done.
- **Current Status:** Open. Not previously tracked anywhere — first surfaced by this document's
  verification pass.

---

## Backend

### AZ-B1 — `notification.requested` is a command wearing an event's clothing (design-only, self-flagged)
- **Description:** `event-catalog.md` §3 explicitly calls out that this one event, unlike every
  other in the catalog, carries a publisher *expectation* (that Notifications will act) even
  though the Event Bus transport gives no delivery guarantee equivalent to a direct call.
- **Priority:** Low (documented risk, not a defect)
- **Impact:** A future reader could mistakenly assume every event in the catalog is equally
  "fire and forget, nobody's depending on this being acted on," and treat a dropped
  `notification.requested` as low-consequence when it isn't.
- **Recommended Solution:** No design change needed — already correctly given the strongest
  priority/retry tier available (P1/RT-Strict, ADR-302). Ensure implementation-time documentation
  (code comments, runbooks) repeats this framing so it isn't lost.
- **Current Status:** Acknowledged by design, not a defect to fix.

### AZ-B2 — Analytics subscribes to every event with no backpressure or failure isolation named
- **Description:** `event-catalog.md` §12 states Analytics "subscribes to every single event in
  this catalog" and that "if Analytics disappeared for an hour, no other module's correctness
  would be affected" — but no document specifies what happens to Analytics' *own* queue/consumer
  if event volume spikes (e.g. a busy multi-game day generating many P0 events).
- **Priority:** Low
- **Impact:** A future implementation could let an Analytics backlog grow unbounded with no
  documented ceiling, though by design this never affects other modules' correctness.
- **Recommended Solution:** When Analytics is actually implemented, specify a bounded queue/backlog
  policy for its own ingestion, consistent with `bullmq-architecture.md`'s general queue-monitoring
  approach (§14).
- **Current Status:** Open, minor — not flagged by the independent security review, identified
  during this document's cross-reference pass.

---

## Security

*(Carried over from `docs/security/09-security-architecture-review.md`, which remains the
authoritative source for full technical detail. All findings below apply to the **design-only**
backend architecture — nothing in the real Phase 1 codebase has authentication, write paths, or
sensitive data today, so none of these are exploitable against the current running system.)*

### AZ-S1 (review: C-1) — In-process module calls carry no verifiable authorization context
- **Priority:** Critical
- **Impact:** A compromised dependency or a future bug in a module constructing its own
  `AuthContext`-shaped object could call another module's function with fabricated
  `{ roles: ["ADMIN"] }` authority — privilege escalation with no architectural barrier, since
  "modules must never communicate directly" currently governs *intent* (R-202), not *authority*.
- **Recommended Solution:** `AuthContext` must be unforgeable — sealed/frozen and constructible
  only by a middleware-only factory function, or cryptographically signed and verified by the
  receiving module.
- **Current Status:** Open — blocking before any inter-module call is implemented.

### AZ-S2 (review: C-2) — The Event Bus has no publisher authentication or event-type authorization
- **Priority:** Critical
- **Impact:** Any module holding a bus reference can publish any event type, including
  identity-sensitive ones (`user.roles_changed`); combined with AZ-S1, a compromised module could
  publish a fraudulent event and let the system's trust in event provenance do the rest.
- **Recommended Solution:** Define an explicit module-to-event-type publisher allow-list as part
  of the Event Bus abstraction itself (checked by `InMemoryEventBus` today, carried forward as
  Kafka ACLs at Stage 3).
- **Current Status:** Open — blocking before the Event Bus is implemented at all.

### AZ-S3 (review: C-3) — Redis is an unhardened, undocumented single point of trust concentration
- **Priority:** Critical
- **Impact:** Redis backs the JWT revocation blocklist, the session cache, rate-limit counters,
  and every BullMQ job payload (including password-reset tokens and full email content) — no
  document specifies authentication, TLS, or network isolation for it.
- **Recommended Solution:** Specify Redis authentication, TLS in transit, and network isolation
  (private network, reachable only from `apps/web` and the worker deployment) as a hard
  requirement, matching the standard already applied to Postgres per-module credentials.
- **Current Status:** Open — blocking before Redis is provisioned for any of its four uses.

### AZ-S4 (review: H-1) — Privilege downgrade does not revoke already-issued tokens
- **Priority:** High
- **Impact:** A user demoted from `ADMIN` to `FAN` retains a valid, `ADMIN`-scoped access token for
  up to its full remaining 15-minute lifetime.
- **Recommended Solution:** `user.roles_changed` must write to the same revocation blocklist as
  `user.deactivated`.
- **Current Status:** Open.

### AZ-S5 (review: H-2) — Fail-open/fail-closed behavior of the token revocation check is unspecified
- **Priority:** High
- **Impact:** If a Redis blocklist lookup fails/times out, undefined behavior means a Redis
  outage could silently and completely disable token revocation platform-wide.
- **Recommended Solution:** Explicitly specify fail-closed (reject the request) on revocation-check
  failure.
- **Current Status:** Open.

### AZ-S6 (review: H-3) — Client-declared `client` parameter determines credential issuance strategy
- **Priority:** High
- **Impact:** `POST /v1/auth/login`'s unverified `client: "web" | "mobile"` field lets any caller
  (including an XSS payload) request a durable refresh token instead of a session cookie.
- **Recommended Solution:** Restrict token-pair issuance to requests presenting a registered mobile
  client identifier, not a self-declared body field.
- **Current Status:** Open.

### AZ-S7 (review: H-4) — Inconsistent account-enumeration posture between login and registration
- **Priority:** High
- **Impact:** Login deliberately gives an identical response for "no such email" and "wrong
  password" to prevent enumeration; registration's `409 CONFLICT` on "email already registered"
  directly defeats that protection one endpoint over.
- **Recommended Solution:** Registration should not distinguish "email taken" from "registration
  accepted" in its immediate response, or apply the same enumeration-resistance posture reasoned
  about for login.
- **Current Status:** Open.

### AZ-S8 (review: H-5) — No dependency/supply-chain security control specified anywhere
- **Priority:** High
- **Impact:** No document specifies SCA scanning, lockfile integrity, SBOM generation, or a
  vulnerability-response policy — a named Security Engineer responsibility with no corresponding
  design.
- **Recommended Solution:** Specify automated dependency vulnerability scanning in CI,
  lockfile-only installs, and a documented triage/patch SLA tied to severity.
- **Current Status:** Open.

### AZ-S9 (review: H-6) — No compensating control for cross-schema referential integrity
- **Priority:** High
- **Impact:** See AZ-A2 (same finding, cross-listed here for the Security category's completeness).
- **Recommended Solution:** See AZ-A2.
- **Current Status:** Open.

### AZ-S10 (review: M-5 / ADR-408) — Refresh tokens/API keys specified to use Argon2id, likely wrong
- **Priority:** Medium
- **Impact:** Argon2id's deliberate slowness is unnecessary overhead (and a self-inflicted
  availability risk at volume) for an already-high-entropy, machine-generated secret — password
  hashing guidance was likely copy-pasted without adjustment.
- **Recommended Solution:** Specify a fast cryptographic hash (SHA-256 is sufficient) for refresh
  tokens and API keys, reserving Argon2id specifically for passwords.
- **Current Status:** Open — see ADR-408 in [DECISIONS.md](./DECISIONS.md) for full detail.

### AZ-S11 (review: M-1) — No SSRF consideration anywhere in the platform design
- **Priority:** Medium
- **Impact:** No stated policy (URL allow-listing, internal-network egress blocking) exists for
  when a plausible near-future feature (e.g. "import an image from a URL") is proposed.
- **Recommended Solution:** Add an explicit SSRF policy to `security-architecture.md` proactively.
- **Current Status:** Open, not yet blocking (no such feature exists today).

### AZ-S12 (review: M-2) — No clickjacking protection specified
- **Priority:** Medium
- **Impact:** `frame-ancestors`/`X-Frame-Options` is entirely absent from the security-header
  baseline.
- **Recommended Solution:** Add `frame-ancestors 'none'` (or a specific allow-list) to the header
  list.
- **Current Status:** Open — blocking before any public-facing write endpoint ships.

### AZ-S13 (review: M-3) — No idempotency-key design for API write endpoints
- **Priority:** Medium
- **Impact:** A network-flaky scorekeeping client retrying `POST /v1/games/{id}/events` after a
  timed-out-but-succeeded request has no guard against recording the same goal twice.
- **Recommended Solution:** Add client-supplied `Idempotency-Key` header support, starting with
  live game-event recording.
- **Current Status:** Open — blocking before live scoring writes ship.

### AZ-S14 (review: M-4) — No Row-Level Security as a second authorization layer
- **Priority:** Medium
- **Impact:** A single application-layer `Self`-check bug is sufficient to expose any user's
  notifications/profile data to any other authenticated user — no independent second layer.
- **Recommended Solution:** Evaluate Postgres RLS policies for user-scoped tables.
- **Current Status:** Open.

### AZ-S15 (review: M-6) — No WAF or edge/network-layer protection specified
- **Priority:** Medium
- **Impact:** Rate limiting is entirely application-layer (Redis sliding window) — known
  insufficient against distributed/volumetric abuse alone.
- **Recommended Solution:** Specify a managed edge protection layer in front of the application.
- **Current Status:** Open.

### AZ-S16 (review: M-7) — Unbounded page depth on offset-based pagination
- **Priority:** Medium
- **Impact:** `pageSize` is capped at 100 but `page` has no upper bound — a latent performance
  cliff and resource-exhaustion lever on the busiest list endpoints.
- **Recommended Solution:** Cap traversable `page` depth, or migrate high-traffic list endpoints to
  cursor-based pagination.
- **Current Status:** Open.

### AZ-S17 (review: M-8) — Stage 3 Kafka migration doesn't specify transport security or topic ACLs
- **Priority:** Medium
- **Impact:** No SASL/TLS or per-topic producer/consumer ACLs specified for the eventual Kafka
  cutover.
- **Recommended Solution:** Add transport security and topic-level ACLs to the cutover checklist.
- **Current Status:** Open, not blocking until Stage 3 begins.

### AZ-S18 (review: L-1 through L-5) — Minor observability/authorization gaps
- **Priority:** Low
- **Impact:** Health-endpoint information disclosure not addressed (L-1); no subprocessor review
  for third-party observability tooling once chosen (L-2); DLQ replay authority not tied to a
  named RBAC permission (L-3); no queue-level access control for BullMQ enqueue (L-4); `/metrics`
  public-exposure prevention mechanism unspecified (L-5, see also ADR-602).
- **Recommended Solution:** See `docs/security/09-security-architecture-review.md` for each
  finding's specific fix.
- **Current Status:** Open, low urgency.

### AZ-S19 — `next` is one patch version behind, missing 6 High/Moderate CVE fixes
- **Description:** All three apps (`web`, `admin`, `mobile-api`) resolve `next` to `15.5.20`
  (per `pnpm-lock.yaml`), one patch below `15.5.21`, which fixes: DoS in App Router Server Actions
  (GHSA-m99w-x7hq-7vfj, High), SSRF in Server Actions on custom servers (GHSA-89xv-2m56-2m9x,
  High), SSRF in rewrites via attacker-controlled destination hostname (GHSA-p9j2-gv94-2wf4,
  High), unauthenticated disclosure of internal Server Function endpoints (GHSA-955p-x3mx-jcvp,
  Moderate), unbounded Server Action payload in Edge runtime (GHSA-4c39-4ccg-62r3, Moderate), DoS
  in Image Optimization via SVGs (GHSA-q8wf-6r8g-63ch, Moderate), and response-body cache
  confusion for requests with invalid-UTF-8 bodies (Moderate). Confirmed via `pnpm audit`
  (previously never run — see AZ-I2/AZ-S8; this is the first time it has been).
- **Priority:** High
- **Impact:** `15.5.21` is within the existing `^15.0.2` semver range in every `package.json` — the
  fix is a lockfile update, not a version bump requiring review. Real exploitability today is
  reduced by AZHL having no custom server and minimal Server Action usage (Phase 1 has none), but
  several of these (SSRF, endpoint disclosure) are exactly the class of bug that becomes serious
  the moment Phase 4/5 add real Server Actions or write paths — fixing now costs nothing and closes
  the gap before it matters.
- **Recommended Solution:** `pnpm update next --recursive`, then re-run the full verification pass
  (`pnpm build && pnpm lint && pnpm typecheck`) before committing.
- **Current Status:** **Resolved (uncommitted).** `next` updated to `15.5.22` across all three
  apps via `pnpm update next --recursive`; a follow-up `pnpm audit` confirms every CVE listed above
  (both SSRF variants, the App Router DoS, endpoint disclosure, unbounded payload, image-optimization
  DoS, cache confusion) no longer appears. `pnpm build`/`lint`/`typecheck` have **not** been re-run
  against this bump yet — do so before committing the `pnpm-lock.yaml` change.

### AZ-S20 — `sharp` (0.34.5) has known libvips CVEs and is actively used today, not just a future concern
- **Description:** `sharp@0.34.5` (Next.js's own image-optimization dependency) is vulnerable
  (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 — GHSA-f88m-g3jw-g9cj), fixed in
  `>=0.35.0`. `next/image` is already used in real components today
  (`hero-logo.tsx`, `team-logo.tsx`, `image-placeholder.tsx`), so this isn't purely a Phase 5
  media-pipeline concern (`storage-architecture.md` §4–§5) — the vulnerable image-processing path
  is live now, just currently fed only admin-provided static assets rather than user uploads.
- **Priority:** Medium (low real exploitability today — no untrusted image input yet — but tracked
  as High priority once Phase 5's user/editor upload path goes live per ADR-501)
- **Impact:** Once Phase 5 accepts uploaded images, a malformed image could reach a vulnerable
  libvips code path through this same dependency.
- **Recommended Solution:** **Not a plain `pnpm update`, deliberately not applied as one.**
  `sharp` isn't a direct AZHL dependency — it's `next@15.5.22`'s own `optionalDependency`, pinned
  to `^0.34.3`, which structurally excludes `0.35.0+` (a 0.x.y caret range treats a minor bump as
  breaking). `pnpm update sharp` cannot cross that boundary; only a `pnpm.overrides` entry in the
  root `package.json` forcing `sharp: ">=0.35.0"` can. That override was deliberately **not**
  applied in this pass: Next.js's own maintainers capping the range at `<0.35.0` is itself a signal
  they haven't yet verified `0.35.x` compatibility with their image-optimization pipeline, and
  forcing it past that boundary without testing risks breaking native image-binding behavior for a
  vulnerability whose real exploitability today is low (no untrusted image input exists yet). This
  is the same "don't blindly apply a fix just because a patched version exists" judgment the
  external skills-library workflow requires for skill recommendations, applied here to a dependency
  override.
- **Current Status:** Open. Track upstream Next.js releases for when they bump their own `sharp`
  pin past `0.35.0`; revisit forcing the override (with a real compatibility test against
  `next/image` output) specifically before Phase 5's upload path ships, not before.

### AZ-S21 — No security headers configured on the real, currently-running site
- **Description:** `apps/web/next.config.mjs` has no `headers()` function; no `middleware.ts`
  exists anywhere in `apps/web/src`. Zero `Content-Security-Policy`, `X-Frame-Options`/
  `frame-ancestors`, `X-Content-Type-Options`, `Strict-Transport-Security`, or `Referrer-Policy` on
  any response. This is distinct from the design-only finding M-2 (clickjacking, scoped in the
  original review to "before any public-facing write endpoint goes live") — Phase 1's real,
  buildable-today site already has this gap, and closing it doesn't require Phase 4 auth or any
  write path to exist first.
- **Priority:** Medium
- **Impact:** No clickjacking protection, no MIME-sniffing protection, no forced-HTTPS header —
  all applicable to the site as it exists right now, not just a future auth-gated surface.
- **Recommended Solution:** Add a `headers()` function to `next.config.mjs` implementing the
  header set `security-architecture.md` §5 already specifies for the target design — the design
  already answered "what," this is applying it to the one real app that exists today rather than
  waiting for Phase 4.
- **Current Status:** Open.

### AZ-S22 — Dev-tooling-only dependency vulnerabilities (not shipped to production)
- **Description:** `pnpm audit` additionally found `fast-uri` (via `commitlint`→`ajv`, High —
  GHSA-v2hh-gcrm-f6hx and a second backslash-authority variant) and `brace-expansion` (via
  `eslint`, High — DoS via unbounded expansion). Both reachable only through dev/build tooling
  (commit-msg linting, eslint), never through the deployed runtime.
- **Priority:** Low
- **Impact:** Correctly triaged as low priority — these packages never execute in a served
  request.
- **Recommended Solution:** `pnpm update fast-uri brace-expansion --recursive`.
- **Current Status:** **Resolved (uncommitted).** Applied in the same `pnpm update` pass as AZ-S19;
  a follow-up `pnpm audit` confirms neither package appears anymore (`brace-expansion` now resolves
  to `1.1.18`, above the `1.1.17` patch floor).

### AZ-S23 — `postcss`, pinned by Next.js itself, remains vulnerable after the `next` update
- **Description:** Three `postcss` advisories remain after AZ-S19's `next` update: two High
  (arbitrary file read / path traversal via `sourceMappingURL` in CSS comments) and one Moderate
  (XSS via unescaped `</style>` in generated CSS), plus a fourth entry that's an incomplete-fix
  follow-up of the first. **Correction to this document's initial triage:** these were originally
  (incorrectly) grouped under AZ-S22 as "dev-tooling-only" — `pnpm audit`'s dependency paths show
  all four actually resolve through `next@15.5.22 → postcss`, i.e. Next.js's own internal CSS
  build pipeline, not through eslint/commitlint. `next@15.5.22` pins `postcss` to the **exact**
  version `8.4.31` (no semver range at all), while the patched version is `8.5.23+` — the same
  "vulnerable dependency hard-pinned inside `next` itself, not overridable via a plain `pnpm
  update`" situation as AZ-S20's `sharp` finding, for the same reason (Next's own maintainers
  haven't bumped it yet as of this version).
- **Priority:** Medium. The CVE class (arbitrary file read via a crafted `sourceMappingURL` CSS
  comment) requires an attacker able to inject CSS content into the build pipeline — AZHL's CSS
  today is entirely first-party (Tailwind output, no user/editor-supplied stylesheets), so real
  exploitability against the current codebase is low. This changes if Phase 5 or any future work
  ever lets an editor/user supply raw CSS.
- **Recommended Solution:** Same reasoning as AZ-S20: a `pnpm.overrides` entry forcing
  `postcss: ">=8.5.23"` would fix it, but wasn't applied in this pass without first confirming
  Next's internal Turbopack/webpack CSS pipeline is compatible with a `postcss` four minor versions
  ahead of what it currently ships pinned to. Track upstream `next` releases for when they bump
  this themselves; low urgency to force it manually given the current threat model has no
  attacker-controlled-CSS input path at all.
- **Current Status:** Open — newly identified in this pass (see correction note above); not
  applied.

---

## Infrastructure

### AZ-I1 — Local Docker Compose Postgres is not runnable on the current development machine
- **Description:** `docker-compose.yml` provisions local Postgres and is documented as requiring
  Docker Desktop. No `docker` executable is present in the current shell's `PATH` on this machine.
- **Priority:** Low
- **Impact:** A developer on this machine cannot bring up local Postgres via the documented
  workflow without first installing Docker Desktop — not a code defect, an environment gap.
- **Recommended Solution:** Install Docker Desktop, or confirm an alternative local Postgres
  (e.g. a native install) is acceptable and document it as a supported alternative.
- **Current Status:** Open, environment-specific.

### AZ-I2 — No GitHub remote, no CI execution, no branch protection
- **Description:** This is a deliberate, documented decision (ADR-006), not a gap — restated here
  only because "no CI has ever run against this codebase" is a real current constraint worth
  surfacing in one place alongside other infrastructure facts.
- **Priority:** N/A (by design)
- **Impact:** `.github/workflows/ci.yml` has never executed; lint/typecheck/build/test have only
  ever been verified manually (see [PROJECT_HISTORY.md](./PROJECT_HISTORY.md) — last confirmed
  manual verification was after commit `bc2f2dc`, before the Phase 2/3 frontend work landed).
- **Recommended Solution:** N/A until the documented go-live trigger conditions are met (see
  [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) Future phase).
- **Current Status:** Expected state, not a defect.

### AZ-I3 — Uncommitted working tree carries ~45 new files and 15 modified tracked files
- **Description:** As of this document's creation, substantial Teams/Players/Stats/League/Contacts
  functionality, the 8 design-only `.claude/` architecture docs, and the independent security
  review exist only in the working tree — not committed.
- **Priority:** High (process risk, not a code defect)
- **Impact:** One `git clean`/`git reset --hard` away from data loss; no historical commit record
  of this substantial body of work.
- **Recommended Solution:** Commit in logical, Conventional-Commits-scoped chunks (e.g.
  `docs(docs): add design-only backend architecture series`,
  `feat(web): add teams/players/stats pages`), after resolving AZ-A1's roadmap-alignment question.
- **Current Status:** Open.

### AZ-I4 — `docker-compose.yml` hardcodes a default Postgres password and binds to all interfaces
- **Description:** The committed `docker-compose.yml` sets `POSTGRES_PASSWORD: azhl_dev` as a
  plain literal and maps `"5432:5432"` with no bind address, which Docker resolves to `0.0.0.0` —
  reachable from any device on the same network as the host, not just `localhost`.
- **Priority:** Low (local-dev-only service, never internet-exposed by design — no production
  deployment uses this file) but zero-cost to fix and a real, currently-committed weak credential.
- **Impact:** On a shared or untrusted network (e.g. public Wi-Fi, a shared dev VM), the local
  Postgres instance is reachable with a trivial, publicly-visible-in-source-control password.
- **Recommended Solution:** Bind the port to the loopback interface explicitly
  (`"127.0.0.1:5432:5432"`), and consider sourcing the password from a gitignored root `.env` via
  Compose variable substitution (`${POSTGRES_PASSWORD:-azhl_dev}`) so the default is documented
  but a developer can override it without editing a tracked file.
- **Current Status:** Open.

---

## Performance

### AZ-P1 — `game_events` and `audit_logs` are unpartitioned append-only tables (design-only)
- **Description:** Both tables are explicitly flagged in `database-erd.md` §14 as the clearest
  Postgres native-partitioning candidates (by season or time) — not yet a problem at zero rows,
  but a known future need.
- **Priority:** Low (not yet built, so not yet urgent)
- **Impact:** Without partitioning, these tables would grow unbounded and eventually degrade query
  performance and vacuum/maintenance cost at real production volume.
- **Recommended Solution:** Implement partitioning once real volume approaches the millions-of-rows
  range — explicitly not before, per the source document's own scope discipline.
- **Current Status:** Open, tracked, correctly deferred.

### AZ-P2 — Offset-based pagination degrades at high page depth
- **Description:** Same finding as AZ-S16 — listed here too because it's a genuine performance
  concern independent of its security-resource-exhaustion framing.
- **Priority:** Medium
- **Impact:** Query cost grows with offset regardless of `pageSize`.
- **Recommended Solution:** See AZ-S16.
- **Current Status:** Open.

---

## Future Improvements

### AZ-FI1 — AVIF image format adoption
Deferred until real bandwidth/cost data justifies the higher encoding cost over WebP (ADR-505).
No action needed until that data exists.

### AZ-FI2 — Adaptive bitrate video streaming (HLS/DASH)
Explicitly out of Stage 1 scope (`storage-architecture.md` §5) — a single H.264/MP4 rendition is
sufficient for expected highlight-clip/interview content. Revisit only if content type changes
(e.g. full-game streaming, per the Future-phase live-streaming roadmap item).

### AZ-FI3 — Storage lifecycle policies (cold-tier transitions)
Real cost-optimization lever once multi-season stored volume justifies the added retrieval-latency
complexity (`storage-architecture.md` §11) — not worth designing further today.

### AZ-FI4 — WebAuthn/passkeys as the primary 2FA method
Documented upgrade path once Auth.js/browser support and the user base are ready (ADR-405);
TOTP remains the correct Stage 1 choice.

### AZ-FI5 — Resource-instance-level permission ACLs
Deliberately not designed in the current RBAC model (ADR-402) — e.g. "this editor can only edit
*this* team's news." Add as a `permissions`/`role_permissions` schema extension only once a real
product requirement needs it.

### AZ-FI6 — Distributed tracing at Stage 3 (Kafka module extraction)
Already designed for (`correlationId`/trace ID propagates through Kafka message headers per
`observability-architecture.md` §13) but not implementable until Stage 3 backend work begins.
