# Security Architecture Review

**Document type:** Architecture Security Review
**Classification:** Internal — Engineering
**Review basis:** All AZHL architecture design documents to date (see Review Scope)
**Status:** Design-stage review — no implementation exists yet; findings apply to the *design*,
not running code

---

## Executive Summary

This review assesses the AZHL Platform's complete backend architecture — modular monolith
structure, database design, REST contract, event-driven architecture, security model, background
job architecture, object storage design, and observability plan — against OWASP ASVS, the OWASP
Top 10, the OWASP API Security Top 10, and Security by Design principles.

The architecture is, overall, unusually mature for a pre-implementation design: password hashing
(Argon2id), token handling (refresh-token rotation with reuse detection), RBAC (permission-based,
enforced at the API boundary rather than scattered through business logic), audit logging
(immutable, admin-only, correctly excluded from soft-delete semantics), and API versioning are
all designed to a standard consistent with ASVS Level 2. Several individual documents explicitly
reason about tradeoffs (e.g. why P0 live events use a weaker retry policy, why audit logs cannot
themselves be soft-deleted) in a way that reflects genuine security judgment, not boilerplate.

However, this review identifies **3 Critical**, **6 High**, **8 Medium**, and **5 Low** severity
findings. The most significant pattern across findings is that **the modular monolith's core
promise — "business modules must never communicate directly" — is currently enforced entirely by
convention, not by any technical control.** Nothing in the reviewed documents prevents one
in-process module from fabricating an elevated `AuthContext` when calling another module's public
function, or from publishing a domain event under another module's identity. This is not a flaw
in any single document; it is a gap in how the documents connect, visible only when they are read
together — which is the purpose of this review.

A second cross-cutting theme is that **Redis has quietly become the platform's single most
concentrated point of trust** — it holds the JWT revocation blocklist, the session cache, rate-limit
counters, and BullMQ job payloads (including password-reset tokens and full notification content)
— with no document specifying its own authentication, transport encryption, or network isolation.

None of the findings below invalidate the architecture. All are addressable at the design level,
before implementation begins, which is the intended value of reviewing at this stage rather than
after code exists.

---

## Review Scope

This review covers the following architecture documents, treated as the single source of truth
for the system as designed:

| Document | Path |
|---|---|
| System / Backend Architecture | `.claude/backend-architecture.md` |
| Database Design (ERD) | `.claude/database-erd.md` |
| REST API Contract | `.claude/api-specification.md` |
| Event Catalog | `.claude/event-catalog.md` |
| Security Architecture | `.claude/security-architecture.md` |
| BullMQ Architecture | `.claude/bullmq-architecture.md` |
| Storage (MinIO) Architecture | `.claude/storage-architecture.md` |
| Observability & Monitoring | `.claude/observability-architecture.md` |

Out of scope: source code (none exists yet), infrastructure-as-code, third-party vendor security
posture (Cloudinary, Vercel, a future email provider), and any review of `apps/web`'s existing
Phase 1 frontend implementation, which carries no authentication, write paths, or sensitive data
today.

Standards applied: OWASP ASVS v4.0.3, OWASP Top 10 (2021), OWASP API Security Top 10 (2023),
Security by Design / Zero Trust principles (verify explicitly, least privilege, assume breach).

---

## Security Assessment

### Critical Findings

#### C-1. In-process module calls carry no verifiable authorization context

**Affected documents:** `backend-architecture.md` §3 (rule 2), §11–§12; `security-architecture.md` §3

The architecture's central rule — a module needing data from another module calls its public
`index.ts` function directly, receiving an `AuthContext` (`{ userId, roles, sessionId }`) resolved
"by API-layer middleware before a module's function is ever called" — describes *where* an
`AuthContext` is normally constructed, but nothing in any reviewed document prevents **any**
in-process code from constructing its own `AuthContext`-shaped object and passing it to another
module's exported function directly. In a single Node process (Stage 1, and still true after the
optional Stage 2 Redis bridge), there is no runtime boundary between "middleware calling a module"
and "any other module calling that same module the same way." A compromised dependency, a
supply-chain-injected package (see H-5), or simply a future bug in a module that constructs its
own context object for a legitimate-looking internal reason, can call `roster.updatePlayer(...)`
or `identity.assignRole(...)` with a fabricated `{ roles: ["ADMIN"] }` context, and nothing
described in this architecture detects or prevents it.

This is precisely the failure mode "modules must never communicate directly" was meant to close —
but the rule as designed governs *intent* (use the public interface, not the database), not
*authority* (prove you're allowed to call it with these privileges). A convention enforced by code
review is not a security control.

**Risk:** Privilege escalation from any single compromised or buggy module to platform-wide admin
authority, with no architectural barrier.

**Required mitigation:** `AuthContext` must be an unforgeable, capability-scoped object —
concretely, either (a) sealed/frozen and constructible only by a single, tightly-scoped factory
function that only the API-layer middleware can invoke (enforced via module privacy, not just
convention), or (b) cryptographically signed (even a short-lived HMAC over the context, verified
by the receiving module) so a module receiving a context can verify it originated from the real
middleware rather than from arbitrary caller code. This must be resolved before any inter-module
call is implemented, not addressed later as a hardening pass.

**Remediation status: Design accepted, not yet implemented.** See
[ADR-001: Inter-Module Trust Model](../adr/ADR-001-inter-module-trust.md) — combines both options
named above rather than choosing one: (a) an `AsyncLocalStorage`-propagated, capability-gated
Principal (a private `Symbol` + restricted package `exports`) for the common in-process case, and
(b) cryptographic signing (a dedicated Internal Principal Token key pair) specifically for the
cases where a Principal must cross a real process/serialization boundary (a BullMQ job payload
today; a Kafka message at Stage 3). No application code implementing this exists yet — this
finding remains open until the architecture in ADR-001 is actually built and its regression tests
(ADR-001 §10) pass in CI.

---

#### C-2. The Event Bus has no publisher authentication or event-type authorization, at either stage

**Affected documents:** `backend-architecture.md` §4–§5; `event-catalog.md` (all sections)

The `EventBus` interface (`publish<T>(event)`, `subscribe<T>(eventType, handler)`) has no concept
of *who* is allowed to publish *which* event type. At Stage 1 (`InMemoryEventBus`), any module
holding a reference to the bus can publish any event — including identity-sensitive ones such as
`user.roles_changed` or `season.finished`, which materially affect other modules' state
(`event-catalog.md` §4–§5). At Stage 3, the migration plan (`backend-architecture.md` §5) specifies
topic-per-event-type and consumer groups per subscribing module, but does not specify **producer
ACLs** — a real, standard Kafka capability (per-principal, per-topic ACLs) that is simply absent
from the design.

Combined with C-1, this means a single compromised module doesn't need to forge a direct call —
it can instead publish a fraudulent `user.roles_changed` or `game.finished` event and let the
system's own trust in event provenance do the rest. `event-catalog.md` §10 already identifies
`notification.requested` as a "command dressed as event" with real side effects if abused; every
event in the catalog deserves the same scrutiny, and none currently has any publisher-identity
verification at all.

**Risk:** Any module can trigger any other module's event-driven side effects — recomputing
standings incorrectly, sending fraudulent notifications, or (worst case) escalating privileges via
a forged identity event — without needing to compromise the Identity module directly.

**Required mitigation:** Define an explicit "which modules may publish which event types" allow-list
as part of the Event Bus abstraction itself (checked by `InMemoryEventBus` today, carried forward
as Kafka ACLs at Stage 3), not left as an unenforced convention in a table.

**Remediation status: Design accepted, not yet implemented.** See
[ADR-002: Event Bus Trust Model](../adr/ADR-002-event-bus-trust.md) — a composition-root-bound
publisher per module (identity fixed at wiring time, unforgeable by the module itself), gated by
an `EVENT_PUBLISHER_ALLOWLIST` derived from `event-catalog.md`'s existing Producer column, plus a
signed Provenance Claim (a third, dedicated key domain) for anything crossing a process boundary —
BullMQ jobs today, Kafka messages at Stage 3. Builds directly on
[ADR-001](../adr/ADR-001-inter-module-trust.md)'s Principal mechanism without duplicating it: two
distinct identities (which user vs. which module), composed rather than conflated. No application
code implementing this exists yet — this finding remains open until ADR-002's design is actually
built and its regression tests (ADR-002 §12) pass in CI.

---

#### C-3. Redis is an unhardened, undocumented single point of trust concentration

**Affected documents:** `security-architecture.md` §1, §7; `bullmq-architecture.md` §2, §8;
`backend-architecture.md` §8

Across the reviewed documents, Redis is specified as the backing store for: the JWT revocation
blocklist (`security-architecture.md` §1), the session cache that fronts Postgres-backed sessions
(§7), rate-limiting counters (`backend-architecture.md` §8, `security-architecture.md` §6), and
every BullMQ job's payload — including, concretely, password-reset tokens in transit
(`event-catalog.md`, `user.password_reset_requested`) and full outbound email content
(`bullmq-architecture.md` §8). No reviewed document specifies that this Redis instance requires
authentication (`requirepass`/ACLs), requires TLS in transit, or is network-isolated from anything
other than the application/worker processes that need it. Redis is frequently deployed with no
authentication by default in real-world incidents; the architecture does not pre-empt this.

**Risk:** Compromise of a single, under-specified Redis instance simultaneously defeats session
revocation, rate limiting, and exposes password-reset tokens and notification content in plaintext
— a single point of failure for four independent security controls at once.

**Required mitigation:** Redis must be specified, before implementation, as requiring
authentication, TLS in transit, and network isolation (private network/VPC, reachable only from
`apps/web` and the worker deployment) — the same standard already correctly applied to Postgres
per-module credentials (`backend-architecture.md` §6) must apply here.

**Remediation status: Design accepted, not yet implemented.** See
[ADR-003: Redis Security Architecture](../adr/ADR-003-redis-security.md) — Redis ACL authentication
(never a single shared password), mandatory TLS/network isolation outside local development, and a
minimum two-instance Stage-1 split (`azhl-redis-critical` for session/revocation/rate-limit/queue
data, `azhl-redis-cache` for general cache), justified by both trust-tier separation and an
independent eviction-policy conflict that a single shared instance cannot resolve. Directly answers
the password-reset-token exposure this finding called out: the token is never embedded in a job
payload as plaintext (field-level encryption via a fourth, dedicated key domain — the Job Payload
Encryption Key), with minimized dwell time and a short expiry as additional layers. No
infrastructure or application code implementing this exists yet — this finding remains open until
ADR-003's design is actually provisioned/built and its regression tests (ADR-003 §18) pass.

---

### High Severity Findings

#### H-1. Privilege downgrade does not revoke already-issued tokens

**Affected documents:** `security-architecture.md` §1, §3; `event-catalog.md` (`user.roles_changed`)

`security-architecture.md` §1 specifies JWT revocation via a Redis blocklist "for the specific
case of `user.deactivated`/a forced logout." `user.roles_changed` is not listed as a trigger for
that blocklist. A user demoted from `ADMIN` to `FAN` (e.g. because they were caught misbehaving,
or their account is suspected compromised but not yet fully deactivated) retains a valid,
`ADMIN`-scoped access token for up to its full remaining lifetime (§1's own stated 15 minutes) after
the demotion. §3 acknowledges the general JWT-staleness tradeoff but frames it only around the
short lifetime being "an accepted tradeoff," without addressing that a *deliberate, known-urgent*
role change (as opposed to routine claim staleness) should not wait out that window at all.

**Required mitigation:** `user.roles_changed` must also write to the same revocation blocklist as
`user.deactivated` — a role change is exactly the case where immediate invalidation matters most.

**Remediation status: Design accepted, not yet implemented.** See
[ADR-004: H-1 Remediation](../adr/ADR-004-H-1-remediation.md) — closer analysis found that this
finding's own suggested fix ("write to the same blocklist") does not actually work: a jti-blocklist
can only revoke a specifically-known token, and Identity has no record of which `jti` is currently
live for a user at role-change time. This also means the *existing* `user.deactivated` case had the
identical latent problem, not only `user.roles_changed`. The real fix adds a second, complementary
mechanism — a per-user "not-before" timestamp, checked against each token's issue time — triggered
**synchronously** inside the same privileged operation that changes the role (not via the
asynchronous event, to avoid reintroducing a smaller version of the same gap). No application code
implementing this exists yet — this finding remains open until ADR-004's design is actually built
and its regression tests pass in CI.

---

#### H-2. Fail-open/fail-closed behavior of the token revocation check is unspecified

**Affected document:** `security-architecture.md` §1

If the Redis blocklist lookup (§1) itself fails or times out (Redis unreachable, per C-3), the
architecture does not state whether authentication then fails open (request proceeds, revocation
uncertain) or fails closed (request rejected). ASVS V1.2 requires authentication/session controls
to fail securely by design, not by accident. Given C-3's finding that Redis has no stated hardening
requirement, an unspecified fail-open default here would mean a Redis outage silently and
completely disables token revocation platform-wide at exactly the moment other controls may also
be degraded.

**Required mitigation:** Explicitly specify fail-closed (reject the request) for the revocation
check, with the corresponding availability tradeoff (a Redis outage degrades to "no mobile/API
access" rather than "revocation silently stops working") stated as a deliberate, reviewed choice.

---

#### H-3. Client-declared `client` parameter determines credential issuance strategy

**Affected document:** `api-specification.md` §2 (`POST /v1/auth/login`)

The login endpoint's request body includes `client: "web" | "mobile"`, which the caller supplies
and which determines whether a short-lived cookie session or a long-lived
access+refresh token pair is issued. This value is **not verified** against anything (no
registered client ID, no attestation, no user-agent cross-check). A browser-based caller — or an
attacker running script in the context of an XSS vulnerability elsewhere on the site — can request
`client: "mobile"` and receive a durable refresh token, converting what should be a
session-cookie-scoped compromise into a persistent, exfiltratable credential that outlives the
browser session entirely.

**Required mitigation:** Client type must not be self-declared. At minimum, restrict token-pair
issuance to requests presenting a registered mobile client identifier (and, longer-term, app
attestation); a bare `client` string in a JSON body is not an authentication signal.

---

#### H-4. Inconsistent account-enumeration posture between login and registration

**Affected document:** `api-specification.md` §2

`POST /v1/auth/login` is explicitly designed to give an identical `401` response whether the email
doesn't exist or the password is wrong, "to avoid account enumeration" — a correct, deliberate
choice, stated as such in the spec. `POST /v1/auth/register`, immediately above it in the same
document, returns `409 CONFLICT` specifically when "email already registered." This directly
defeats the enumeration protection the login endpoint was designed to provide — the same
information (does this email have an account) is available one endpoint over.

**Required mitigation:** Registration should not distinguish "email taken" from "registration
accepted" in its immediate response (send a verification email regardless, framed identically to
the caller either way) or should apply the same rate-limiting/enumeration-resistance posture
explicitly reasoned about for login.

---

#### H-5. No dependency / supply-chain security control is specified anywhere

**Affected documents:** all — absence is the finding; cf. `CLAUDE.md`'s agent table (Security
Engineer owns "dependency risk")

Every reviewed architecture document is silent on software composition analysis, lockfile
integrity verification, SBOM generation, or a policy for responding to a disclosed vulnerability in
a dependency. This is a named responsibility (`CLAUDE.md`'s Security Engineer row) with no
corresponding design anywhere in the eight documents reviewed — a real gap between stated
ownership and actual architecture, and directly relevant given C-1's escalation path is easiest to
realize via a compromised dependency.

**Required mitigation:** Specify, at minimum: automated dependency vulnerability scanning in CI,
lockfile-only installs enforced in CI (no ad hoc version resolution at build time), and a
documented triage/patch SLA tied to severity.

---

#### H-6. No database-enforced referential integrity across module schema boundaries

**Affected documents:** `database-erd.md` §1, §3, §6, §14

By design, no foreign key ever crosses a Postgres schema boundary — cross-schema references are
"plain columns, no FK... enforced at the application layer." This is a deliberate, well-reasoned
tradeoff in service of eventual microservice extraction, and this review does not dispute the
tradeoff itself. However, no reviewed document specifies **any compensating control** — no
scheduled orphan-detection job, no consistency-check reconciliation pass — for the resulting risk:
an application bug (or a race condition between two modules' writes) can silently create a
`games.home_team_id` pointing at a deleted or nonexistent team, and nothing in the database or
the application layer as designed would ever detect it.

**Required mitigation:** At minimum, add a scheduled consistency-check job (the same
`platform.maintenance.*` family already designed in `bullmq-architecture.md` §12) that periodically
verifies cross-schema ID references still resolve, and alerts on drift — the database can no longer
catch this, so something must.

---

### Medium Severity Findings

#### M-1. No SSRF consideration anywhere in the platform design

**Affected documents:** `backend-architecture.md` §7; `storage-architecture.md`; `security-architecture.md`

Server-Side Request Forgery (OWASP Top 10 A10:2021) is not mentioned in any reviewed document.
While no current endpoint explicitly fetches a caller-supplied URL, the Media module's signed-upload
flow and any plausible near-future admin feature ("import an image from a URL," a common CMS
convenience feature) are classic SSRF vectors, and the architecture has no stated policy
(URL allow-listing, internal-network egress blocking from any server-side fetch) to fall back on
when such a feature is eventually proposed.

**Recommendation:** Add an explicit SSRF policy to `security-architecture.md` now, even in the
absence of a concrete feature that needs it today, so the *next* feature proposal is designed
against a standard rather than reviewed for SSRF after the fact.

---

#### M-2. No clickjacking protection specified

**Affected document:** `security-architecture.md` §5, §12

The CSP guidance in §12 specifies `script-src 'self'` but no document anywhere specifies
`frame-ancestors` (CSP) or an equivalent `X-Frame-Options` header. This is a complete gap, not a
partial one — clickjacking defense is absent from the security architecture entirely.

**Recommendation:** Add `frame-ancestors 'none'` (or a specific allow-list if embedding is ever a
legitimate requirement) to §5's security-header list.

---

#### M-3. No idempotency-key design for API write endpoints

**Affected documents:** `api-specification.md` §6 (`POST /v1/games/{id}/events`), §1.7;
`event-catalog.md` §2.4

`event-catalog.md` §2.4 carefully designs idempotency for *event consumption*. No equivalent
design exists for the *originating API write* — a network-flaky scorekeeping client retrying
`POST /v1/games/{id}/events` after a timed-out (but actually-succeeded) request has no
architectural guard against recording the same goal twice at the point of origin, before any event
is even published.

**Recommendation:** Add client-supplied idempotency-key support (a standard pattern: an
`Idempotency-Key` header, checked against a short-lived store before processing a write) to at
least the write endpoints most exposed to real-world network flakiness (live scoring, in
particular).

---

#### M-4. No defense-in-depth for user-owned resource access (no Row-Level Security)

**Affected documents:** `database-erd.md` §4; `api-specification.md` §1.3 (`Self`)

Authorization for a user's own data (notifications, profile) rests entirely on the application
layer's `Self` check (`api-specification.md` §1.3). No reviewed document considers Postgres Row-Level
Security as a second, independent layer. ASVS's access-control requirements favor defense in depth;
as designed, a single application-layer authorization bug is sufficient to expose any user's
notifications or profile data to any other authenticated user.

**Recommendation:** Evaluate RLS policies for `notifications.notifications` and similarly
user-scoped tables as a second enforcement layer, particularly given C-1's finding that
in-process authorization context is not currently verifiable end-to-end.

---

#### M-5. Hash function for high-entropy tokens is unspecified, risking Argon2id misuse

**Affected documents:** `database-erd.md` §4 (`refresh_tokens.token_hash`);
`security-architecture.md` §2, §8, §21

§8 correctly specifies Argon2id for *passwords* (low-entropy secrets, needing a slow, memory-hard
function). §2 and §21 specify that refresh tokens and API keys are "hashed at rest, exactly like a
password" — but a refresh token or API key is a high-entropy, machine-generated secret, for which a
deliberately slow memory-hard hash is unnecessary overhead at best and a self-inflicted
availability/DoS surface at worst (every refresh request paying Argon2id's intentional cost, at
volume). Reusing password-hashing guidance for token-hashing verbatim is very likely not what was
intended, but the documents as written say exactly that.

**Recommendation:** Specify a fast cryptographic hash (SHA-256 is sufficient for a high-entropy,
already-unguessable token) for refresh tokens and API keys, reserving Argon2id specifically for
passwords, where its slowness is the point.

---

#### M-6. No WAF or edge/network-layer protection specified

**Affected document:** `security-architecture.md` §6, §16

Rate limiting is designed entirely at the application layer (Redis sliding window). No document
specifies an edge-layer control (a WAF, volumetric DDoS protection) in front of the application.
Application-layer rate limiting alone is a known-insufficient posture for a public-facing platform
against distributed/volumetric abuse, which no per-IP counter effectively stops.

**Recommendation:** Specify a managed edge protection layer (many are available natively through
the hosting platform already chosen) as a required layer in front of, not instead of, the existing
application-level limiter.

---

#### M-7. Unbounded page depth on offset-based pagination

**Affected document:** `api-specification.md` §1.4

`pageSize` is capped at 100, but `page` itself has no stated upper bound. Offset-based pagination
degrades in query cost as the offset grows regardless of `pageSize`, and an unbounded `page` value
is both a latent performance cliff and a trivial resource-exhaustion lever against the busiest list
endpoints (`/v1/news`, `/v1/players`).

**Recommendation:** Cap total traversable depth (reject or clamp a `page` beyond a sane maximum
given realistic dataset size) or migrate high-traffic list endpoints to cursor-based pagination,
which does not have this degradation curve.

---

#### M-8. Stage 3 Kafka migration does not specify transport security or topic ACLs

**Affected document:** `backend-architecture.md` §5

The Kafka migration section specifies topic-per-event-type, consumer groups, and idempotent
consumers, but does not mention SASL/TLS for broker authentication and transport, nor (compounding
C-2) per-topic producer/consumer ACLs — both standard, expected parts of a production Kafka
deployment, currently absent from the design.

**Recommendation:** Add transport security (TLS) and authentication (SASL) plus topic-level ACLs
to §5's cutover checklist as required steps, not implicit assumptions.

---

### Low Severity Findings

#### L-1. Health/readiness endpoint information disclosure not addressed

**Affected document:** `observability-architecture.md` §9

Whether `/health`/`/ready` endpoints are publicly reachable, and how much detail they return if so
(e.g. "Postgres unreachable" vs. a bare 200/503), is not specified. A verbose public readiness
response is a minor but real information-disclosure surface (reveals internal dependency topology).

**Recommendation:** Specify that any publicly-reachable health endpoint returns a bare status code
with no dependency-level detail; detailed component health is only exposed to internal
monitoring (§5–§6's Prometheus/Grafana access).

---

#### L-2. No subprocessor / data-processing review for third-party observability tooling

**Affected document:** `observability-architecture.md` §8

Error-reporting and log-aggregation are both designed to use a third-party SaaS ("concrete choice
deferred"). Once real user PII exists (even the minimal `userId` references §8 already restricts
payloads to), sending any data to an external subprocessor is a data-processing relationship
worth a documented review once a concrete vendor is chosen — not designed further here, flagged
for that future decision point.

---

#### L-3. DLQ replay authority is not tied to a named RBAC permission

**Affected documents:** `bullmq-architecture.md` §5; `security-architecture.md` §4

DLQ replay is correctly specified as manual and logged, but no reviewed document names a specific
permission (e.g. `queue:replay`) gating who may perform it, leaving its authorization implicit
rather than modeled consistently with every other privileged action in the platform.

---

#### L-4. No queue-level access control for BullMQ enqueue operations

**Affected document:** `bullmq-architecture.md` §3

"Every queue is owned by exactly one module" is a code-organization convention, not a technical
control — any process with Redis access (see C-3) can enqueue into any queue, including
operational ones (`platform.cleanup.sessions`), by construction of how BullMQ uses Redis.

**Remediation status: Design accepted (closed as a consequence of ADR-002), not yet implemented.**
[ADR-002](../adr/ADR-002-event-bus-trust.md) §7 extends its bound-publisher mechanism to
`enqueue()` as well — a module receives a queue-scoped bound enqueue function from the same
composition root, not a generic one capable of targeting any queue. This was not separately
designed work; it fell out of applying C-2's mechanism consistently. Still contingent on C-3's
Redis-hardening remediation for the underlying transport, and on ADR-002's implementation.

---

#### L-5. `/metrics` public-exposure prevention lacks a specified enforcement mechanism

**Affected document:** `observability-architecture.md` §5

Correctly identified as needing to be non-public, but the actual enforcement mechanism (network
ACL, auth token on the scrape endpoint, mTLS) is left unspecified — the requirement is right, the
"how" is not yet decided.

---

## Trust Boundary Analysis

| Boundary | Current control | Adequacy | Residual risk |
|---|---|---|---|
| Browser ↔ `apps/web` | TLS, CSRF (synchronizer token), CSP, input validation | Adequate, pending M-2 (clickjacking) | Low once M-2 closed |
| Mobile/API client ↔ API layer | JWT (RS256) + refresh rotation | Strong mechanism; undermined by H-2/H-3 | High until H-2/H-3 resolved |
| API layer ↔ business module | `AuthContext` passed by convention | **Not enforced as a real boundary** | Critical — see C-1. Remediation designed ([ADR-001](../adr/ADR-001-inter-module-trust.md)); implementation pending |
| Module ↔ Module (Event Bus) | Publish/subscribe, no producer ACL | **Not enforced as a real boundary** | Critical — see C-2. Remediation designed ([ADR-002](../adr/ADR-002-event-bus-trust.md)); implementation pending |
| Module ↔ its own Postgres schema | Least-privilege DB role per schema | Well-designed | Low |
| Any component ↔ Redis | ACL authentication, TLS, network isolation, trust-tiered instance split (design only) | Previously **unhardened** | Critical — see C-3. Remediation designed ([ADR-003](../adr/ADR-003-redis-security.md)); implementation pending |
| API ↔ Object storage | Signed URLs, private-by-default buckets, CDN origin lock | Well-designed | Low, pending M-1 (SSRF on any future URL-import feature) |
| Third-party API key holder ↔ Public API | Hashed key, scoped rate limit, RBAC-mapped context | Well-designed on paper | Not yet implementable safely until C-1/C-2 resolved (a key's `AuthContext` flows through the same unverified path) |

The two "not enforced as a real boundary" rows are the review's central concern: everywhere else,
the documents describe a real mechanism with a specific, assessable strength. At the module and
event boundaries, they describe an *intent* with no corresponding mechanism.

---

## Authorization Review

The RBAC design (`backend-architecture.md` §12, `security-architecture.md` §3–§4) is fundamentally
sound: permission strings are additive by default, checked once at a consistent middleware
boundary rather than scattered through business logic, and role removal is explicitly flagged as
needing the same care as a breaking change. This is a genuinely mature design relative to typical
early-stage architecture.

Its correctness is entirely contingent, however, on the integrity of the `AuthContext` it operates
on — which C-1 finds is not currently guaranteed once execution crosses a module boundary
in-process. Authorization-as-designed is correct; authorization-as-enforceable, given the rest of
the architecture, is not yet guaranteed. M-4's finding (no RLS as a second layer) compounds this:
there is exactly one enforcement point for most authorization decisions in this platform, and no
second, independent layer if that point is ever bypassed or buggy.

Permission removal (§4 of `security-architecture.md`) is described as needing prior review of who
relies on a permission, via audit logs — this is sound guidance but is not, as written, an
*enforced* gate (nothing stops a permission removal from shipping without that review actually
happening).

---

## Authentication Review

Password handling (Argon2id, optional pepper, never logged), TOTP-based 2FA with hashed backup
codes, and risk-based 2FA enforcement (optional for `FAN`, required for `ADMIN`) all meet or exceed
ASVS Level 2 expectations. Refresh token rotation with reuse detection (`security-architecture.md`
§2) is a genuinely strong design choice, not a default one — many systems skip reuse detection
entirely.

The findings in this area (H-1, H-2, H-3, H-4, M-5) are all about the *edges* of an otherwise solid
design: what happens on revocation timing, on infrastructure failure, on a self-declared client
type, and on a token-hashing detail left ambiguous — not about the core mechanism, which is sound.

**Update:** H-1 is now design-remediated by
[ADR-004: H-1 Remediation](../adr/ADR-004-H-1-remediation.md), which found the finding's own
suggested fix insufficient on closer analysis (a jti-blocklist cannot express "revoke every token
for this user") and designed a second, complementary revocation mechanism instead. H-2, H-3, and
H-4 remain open and unaddressed by this pass — H-2 in particular is now a dependency of H-1's own
new mechanism, not just the original jti check (ADR-004's "Explicitly out of scope" section notes
this precisely).

---

## API Security Review

Assessed against the OWASP API Security Top 10 (2023):

| Category | Assessment |
|---|---|
| API1 Broken Object Level Authorization | Partially addressed (`Self`/RBAC per endpoint); no resource-instance ACLs, explicitly deferred as a documented future need — acceptable for current scope |
| API2 Broken Authentication | Strong mechanism overall; see H-1 through H-4 |
| API3 Broken Object Property Level Authorization | Risk not explicitly addressed: generic "any subset of `POST`'s fields" language on `PATCH` endpoints must be implemented as an explicit allow-list per field, never a raw object merge, to avoid mass-assignment when these are built |
| API4 Unrestricted Resource Consumption | Rate limiting exists; concrete limits explicitly deferred to implementation time (acceptable as a design placeholder, but must not ship without real numbers, see Production Readiness); see also M-7 (pagination) |
| API5 Broken Function Level Authorization | Well-designed — endpoint-to-role mapping is explicit and complete in the index (`api-specification.md` §14) |
| API6 Unrestricted Access to Sensitive Business Flows | Password-reset/registration flows need explicit per-flow abuse limits (beyond generic rate limiting) — not separately called out in the current design |
| API7 Server-Side Request Forgery | Absent — see M-1 |
| API8 Security Misconfiguration | See C-3 (Redis — design remediated by [ADR-003](../adr/ADR-003-redis-security.md), not yet implemented), H-5 (dependencies) |
| API9 Improper Inventory Management | Well-designed — versioning policy and full endpoint index are exemplary |
| API10 Unsafe Consumption of APIs | Third-party webhook consumption (e.g. email bounce webhooks, `bullmq-architecture.md` §8) does not specify webhook signature verification — a forged bounce webhook could currently disable a targeted user's notification channel |

---

## Infrastructure Security Review

Per-app deployment independence, per-module least-privilege database credentials, and the
env-var/secrets-management design (`security-architecture.md` §15–§16) are all well-reasoned and
consistent with the platform's stated blast-radius philosophy. The worker deployment being
explicitly separated from `apps/web` (`bullmq-architecture.md` §2) correctly anticipates a real
Vercel serverless-function limitation rather than discovering it during implementation.

The infrastructure review's findings are concentrated entirely in C-3 (Redis hardening) and M-6
(no edge/WAF layer) — both are gaps in an otherwise infrastructure-aware design, not evidence of
infrastructure being unconsidered generally.

**Update:** C-3 is now design-remediated by
[ADR-003: Redis Security Architecture](../adr/ADR-003-redis-security.md), which extends this
platform's already-consistent per-component least-privilege/network-isolation philosophy (noted
above for Postgres and the worker deployment) to Redis specifically — ADR-003's trust-tiered
instance split and per-workload ACL users are the same pattern this section already praised
elsewhere in the architecture, applied to the one place it had been missing. M-6 remains open and
out of scope for this remediation pass. Design accepted; implementation still required before C-3
closes.

---

## Storage Security Review

The MinIO/object-storage design (`storage-architecture.md`) correctly reconciles "buckets are
private by default" with the practical need for publicly cacheable content, via CDN-fronted origin
locking rather than a public-read bucket policy — a genuinely well-reasoned resolution of a
tension the earlier security document had left implicit. Content-versioning-via-immutable-objects
(rather than relying on bucket versioning as the primary mechanism) is a sound design choice.

The one gap (not previously flagged in that document): **content-length enforcement is specified
only as a request-time content-type check**, not as a hard limit on the signed upload policy
itself. A client can request a signed URL for a declared small file and upload a much larger one
unless the presigned policy itself constrains size — this should be closed at the storage-policy
level, not left to a post-upload application check.

---

## Event Bus Security Review

This is the most significant unresolved area in the entire architecture (C-2, restated here in
full for visibility as its own review area per the requested structure): **no event, at any stage,
carries any verifiable claim about which module actually published it.** Every event consumer in
`event-catalog.md` implicitly trusts that an event named `game.finished` genuinely originated from
Game Operations, with no mechanism to verify that trust. `notification.requested`
(`event-catalog.md` §3, §10) is the highest-risk single event in the catalog by this measure — it
is explicitly a command with a real side effect (a message is composed and sent to a real user),
and currently any module can publish one, addressed to any user, about any topic.

This must be resolved as part of the Event Bus's core interface design (C-2's required mitigation),
not deferred to Stage 3 — an in-process authorization gap at Stage 1 does not become less
dangerous just because it's easier to exploit before Kafka's ACL model would eventually be added.

**Update:** [ADR-002: Event Bus Trust Model](../adr/ADR-002-event-bus-trust.md) resolves this at
the design level — see the C-2 remediation note above. Of particular note for this section
specifically: `notification.requested`, identified here as the catalog's highest-risk single
event, is now gated by the same allow-list as every other event (its entry permits multiple
producer modules, matching `event-catalog.md` §10's existing "any module wanting a user
notified... never Notifications itself" design, rather than being treated as a special case).
Design accepted; implementation and its regression tests are still required before this finding
closes.

---

## Logging & Audit Review

The audit log design (`database-erd.md` §11, `security-architecture.md` §14) is one of the
strongest parts of the entire architecture: immutable by explicit design choice (not merely by
omission), correctly excluded from the platform's otherwise-consistent soft-delete pattern with a
clearly stated rationale, and scoped to exactly the events that represent an identifiable actor's
write (`event-catalog.md` §12) rather than logging everything indiscriminately.

`correlationId` propagation through logs, events, and jobs (`backend-architecture.md` §13,
`observability-architecture.md` §1/§3) is a genuinely good foundational decision that pays off
later (§13's note on how it enables distributed tracing at Stage 3 with no redesign).

Findings in this area are minor (L-1, L-2, L-5) and concern enforcement mechanisms and future
third-party data-handling review, not the core design.

---

## Production Readiness

**Not production-ready as currently specified.** This assessment is about the *design*, not
effort remaining — most of what's needed is clarification and a small number of concrete
mechanism choices, not a redesign.

**Blocking for any production deployment handling real user accounts or payment-adjacent data:**
C-1, C-2, C-3, H-1, H-2, H-3, H-5.

**Blocking specifically before any public-facing write endpoint (live scoring, user-generated
content) goes live:** M-3 (idempotency), H-4 (enumeration), M-2 (clickjacking).

**Not blocking, but must be resolved before the corresponding feature ships:** M-1 (SSRF, once a
URL-import-style feature is proposed), M-8 (Kafka transport security, once Stage 3 begins), L-2
(subprocessor review, once a concrete vendor is chosen).

**Explicitly deferred by design, and correctly so:** resource-instance-level ACLs, WebAuthn/passkeys,
SSO, multi-region storage replication — all correctly scoped as future work in their source
documents, not findings of this review.

---

## Required Architecture Changes Before Implementation

1. Define an unforgeable `AuthContext` mechanism (sealed construction or signed context) — **design
   complete, see [ADR-001](../adr/ADR-001-inter-module-trust.md); implementation still required to
   close C-1**.
2. Add publisher authorization (an explicit module-to-event-type allow-list, carried forward as
   Kafka ACLs at Stage 3) to the Event Bus abstraction — **design complete, see
   [ADR-002](../adr/ADR-002-event-bus-trust.md); implementation still required to close C-2**.
3. Specify Redis authentication, TLS, and network isolation as a hard requirement, not an implicit
   assumption — **design complete, see [ADR-003](../adr/ADR-003-redis-security.md); implementation
   still required to close C-3**.
4. Add `user.roles_changed` as a token/session revocation trigger, equal to `user.deactivated` —
   **design complete, see [ADR-004](../adr/ADR-004-H-1-remediation.md) (a per-user "not-before"
   mechanism, not a blocklist extension — the latter doesn't work for this case); implementation
   still required to close H-1**.
5. Specify fail-closed behavior for the token revocation check on Redis unavailability — closes H-2.
6. Remove client-self-declared token-issuance strategy; require a registered client identifier for
   mobile-style token issuance — closes H-3.
7. Align registration's response behavior with login's enumeration-resistance posture — closes H-4.
8. Add a dependency/supply-chain security policy (SCA scanning, lockfile enforcement in CI) —
   closes H-5.
9. Add a scheduled cross-schema referential-integrity check job — closes H-6.
10. Specify SSRF policy ahead of any URL-fetching feature proposal — closes M-1.
11. Add `frame-ancestors`/`X-Frame-Options` to the security-header baseline — closes M-2.
12. Add idempotency-key support to write endpoints exposed to real-world client retry, starting
    with live game-event recording — closes M-3.
13. Specify the hash function for refresh tokens/API keys as distinct from Argon2id — closes M-5.
14. Add a managed edge/WAF layer requirement in front of the application-level rate limiter —
    closes M-6.

Items 1–3 are prerequisites for beginning any implementation work involving inter-module calls or
the Event Bus at all — they are architectural, not incremental hardening, and are cheapest to fix
before any code exists that assumes the current, unenforced trust model.

---

## Security Checklist

Verification checklist for implementation sign-off, organized by review area. This checklist is
additive to (not a replacement for) each source document's own design.

**Trust boundaries**
- [ ] `AuthContext`/Principal cannot be constructed outside the designated middleware factory
      (design: [ADR-001](../adr/ADR-001-inter-module-trust.md); not yet implemented)
- [ ] `packages/platform/security-context`'s mint/bind path is unreachable from any package other
      than `packages/platform/http-boundary` (Node `exports` map enforcement, ADR-001 §2)
- [ ] No exported module function accepts a `Principal`/`AuthContext`-typed parameter (ADR-001 §10 static check)
- [ ] Event Bus rejects a publish call for an event type not on that module's allow-list
      (design: [ADR-002](../adr/ADR-002-event-bus-trust.md); not yet implemented)
- [ ] No module holds a reference to the raw/unbound `publish()`/`enqueue()` — only the composition
      root, verified via `exports`-map enforcement (ADR-002 §1, §7, §12)
- [ ] A tampered Provenance Claim (payload or signature) fails verification and routes to the DLQ,
      never processed (ADR-002 §5, §7)
- [ ] Redis requires ACL authentication in every environment, including local development, and TLS
      in every environment reachable over a network (staging/production; local loopback exempt)
      (design: [ADR-003](../adr/ADR-003-redis-security.md); not yet implemented)
- [ ] `azhl-redis-critical` and `azhl-redis-cache` are provisioned as separate instances, each with
      the eviction policy its tier requires (`noeviction` vs. `allkeys-lru`) (ADR-003 §5, §10)
- [ ] Every Redis client connects with a workload-scoped ACL user (never the default/admin user),
      restricted to its own key prefix (ADR-003 §2)
- [ ] Password-reset tokens (and any other JPEK-protected job field) are never present in Redis in
      plaintext, verified by inspecting the raw stored value (ADR-003 §7, §8, §18)

**Authentication**
- [ ] `user.roles_changed` and `user.deactivated` both write a `revocation:not-before:{userId}`
      key synchronously, inside the same operation that changes Postgres — not via the async event
      (design: [ADR-004](../adr/ADR-004-H-1-remediation.md); not yet implemented)
- [ ] A token issued before a user's `revocation:not-before` timestamp is rejected on its next use,
      even though its specific `jti` was never individually blocklisted (ADR-004 §3.2)
- [ ] Individual (jti) and broad (not-before) revocation checks are verified independent — one
      does not mask a bug in the other (ADR-004 regression tests)
- [ ] Token revocation check (both the jti check and the new not-before check) fails closed on
      Redis unavailability — H-2, still open, must cover both checks identically once resolved
- [ ] Mobile/long-lived token issuance requires a registered client identifier, not a request body flag
- [ ] Registration and login responses carry equivalent account-enumeration resistance
- [ ] Refresh tokens and API keys are hashed with a fast cryptographic hash, not Argon2id

**Authorization**
- [ ] Every write endpoint's field-level updates are implemented as an explicit allow-list, never a raw merge
- [ ] A permission removal cannot ship without a preceding audit-log-based usage check

**API security**
- [ ] Idempotency-key support exists on live game-event recording at minimum
- [ ] `page` query parameter has an enforced upper bound or the endpoint uses cursor pagination
- [ ] Every third-party webhook consumer verifies the webhook's signature before acting on it

**Infrastructure**
- [ ] A dependency vulnerability scan runs in CI with a defined patch SLA
- [ ] A managed WAF/edge layer sits in front of the application in every real environment
- [ ] A scheduled job verifies cross-schema ID references still resolve

**Storage**
- [ ] Signed upload policies enforce a maximum content length at the storage layer, not only at request time

**Observability**
- [ ] Public health endpoints return a bare status code with no dependency-level detail
- [ ] `/metrics` is confirmed unreachable from outside the monitoring network in every environment

---

## Final Security Readiness Score

| Category | Score (0–10) | Rationale |
|---|---|---|
| Authentication design | 7 | Strong core mechanism (Argon2id, TOTP, refresh rotation); edge-case gaps (H-1–H-4) |
| Authorization design | 6 | Sound RBAC model undermined by unverifiable execution context (C-1) |
| API contract security | 7 | Strong versioning/inventory discipline; SSRF/idempotency/webhook gaps |
| Event-driven architecture | 4 | No producer authentication at any stage (C-2) — the single lowest-scoring area |
| Infrastructure hardening | 5 | Good app-level design; Redis unhardened (C-3), no edge layer (M-6) |
| Storage security | 8 | Well-reasoned public/private resolution; one enforcement gap |
| Observability & audit | 8 | Genuinely strong audit-log and correlation design; minor disclosure gaps |

**Overall Security Readiness Score: 6.1 / 10 — Design shows strong security judgment in most
areas; three unresolved Critical findings (module-boundary trust, event-bus trust, Redis hardening)
must be closed before implementation begins.**

This score reflects a *design*, not a deployed system — it is expected to rise substantially once
the Required Architecture Changes above are incorporated, since none of the Critical or High
findings require abandoning any existing design decision, only completing one.

---

*This document should be revisited and re-scored after the Required Architecture Changes are
incorporated into their respective source documents, and again before any production go-live
decision.*
