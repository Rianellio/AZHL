# ADR-003: Redis Security Architecture — Trust-Tiered Isolation

- **Status:** Accepted (design). Not yet implemented — no infrastructure or application code exists
  for this decision yet; see [Consequences](#consequences) for implementation prerequisites.
- **Date:** 2026-07-30
- **Deciders:** Chief Architect, Security Engineer, DevOps Engineer, Backend Engineer (per
  [`.claude/ai-workflow.md`](../../.claude/ai-workflow.md) routing)
- **Supersedes:** The implicit "one Redis instance for everything" assumption in
  [`backend-architecture.md`](../../.claude/backend-architecture.md) §8,
  [`security-architecture.md`](../../.claude/security-architecture.md) §1/§6/§7, and
  [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §2/§8, which this ADR replaces
  with explicit trust tiers.
- **Builds on:** [ADR-001: Inter-Module Trust Model](./ADR-001-inter-module-trust.md) and
  [ADR-002: Event Bus Trust Model](./ADR-002-event-bus-trust.md) — this document does not redesign
  either; §16 states precisely how Redis hardening and their signing-based designs are
  complementary, not overlapping.
- **Remediates:** Finding **C-3** in
  [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)

---

## Context

[`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)
finding C-3 identified that Redis had quietly become the platform's single most concentrated point
of trust: it was specified (across four separate documents, each reasoning about its own workload
in isolation) as the backing store for the JWT revocation blocklist
([`security-architecture.md`](../../.claude/security-architecture.md) §1), the session cache
fronting Postgres (§7), rate-limiting counters (§6), and every BullMQ job's payload — including,
concretely, password-reset tokens in transit and full outbound email content
([`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §8) — with **no document
specifying authentication, transport encryption, or network isolation for the instance itself.**
Real-world Redis deployments are frequently found running with no authentication by default; the
architecture did not pre-empt this.

The request for this ADR is explicit that **not every Redis workload should share the same trust
boundary.** This document's central task is therefore not "harden Redis" as a single undifferentiated
action, but to first separate what Redis is actually being asked to do into tiers with genuinely
different sensitivity, durability, and availability requirements, and only then decide which tiers
can safely share fate and which cannot.

This decision must:
- Preserve the Modular Monolith architecture exactly as designed.
- Provide technical enforcement (authentication, ACLs, network policy), not a hardening checklist
  a deploy might forget to apply.
- Work today, at Stage 1, not only once a dedicated platform team exists to run Redis Cluster.
- Compose with [ADR-001](./ADR-001-inter-module-trust.md)/[ADR-002](./ADR-002-event-bus-trust.md)
  rather than duplicate their signing infrastructure.

---

## Decision

### 1. Redis authentication and authorization

**No anonymous access, in any environment, including local development.** Every Redis connection
authenticates via Redis 6+ ACL (`ACL SETUSER`), never the legacy single shared `requirepass` alone
— a shared password is one secret protecting every workload equally; ACL users (§2) are how
different workloads get different privileges from the same authentication mechanism. Local
development uses the identical ACL structure as production at reduced operational rigor (§15) —
specifically so an ACL-related bug is caught on a developer's machine, not discovered for the
first time in staging.

### 2. Redis ACLs and least privilege

One Redis ACL user per workload, each restricted to a specific key-prefix pattern and a minimal
command set — never the default/admin user, which is reserved for a separate, manually-invoked
break-glass credential never embedded in application configuration:

| ACL user | Key prefix | Commands (representative, not exhaustive) | Workload |
|---|---|---|---|
| `azhl-session` | `session:*` | GET, SET, DEL, EXPIRE | Session cache (§5 Tier A) |
| `azhl-revocation` | `revocation:*` | SET, EXISTS, DEL | JWT/session revocation blocklist (Tier A) |
| `azhl-ratelimit` | `ratelimit:*` | INCR, EXPIRE, GET | Rate limiting (Tier A) |
| `azhl-bullmq` | `bull:*` | Standard BullMQ command set **plus explicit per-script-hash `EVAL`/`EVALSHA` allowances** (Redis ACL supports allow-listing specific script SHA1 hashes, not a blanket `+eval`) | Queues (Tier B) |
| `azhl-lock` | `lock:*` | SET (NX), DEL | Distributed locks (Tier B) |
| `azhl-idempotency` | `idempotency:*` | SET (NX, EX), EXISTS | Event/job dedup (Tier B) |
| `azhl-pubsub` | `live:*` channels | PUBLISH, SUBSCRIBE | Realtime fan-out (Tier B) |
| `azhl-cache` | `cache:*` | GET, SET, DEL, EXPIRE | General read-through cache (Tier C) |

No application-facing ACL user is ever granted `KEYS`, `FLUSHALL`, `FLUSHDB`, `CONFIG`, `SHUTDOWN`,
or unrestricted `EVAL` — commands capable of enumerating or destroying data outside a user's own
prefix, or executing arbitrary server-side logic, are excluded by construction, not by convention.

### 3. TLS/encryption in transit

**Mandatory in every environment where Redis is reachable over a network** — staging and
production, no exceptions. Local development is the one documented exception, and only because
the connection never leaves loopback/a docker-compose-internal network with no other untrusted
containers present; the moment any shared, staging, or production environment is involved, TLS is
required with no opt-out. This mirrors
[`security-architecture.md`](../../.claude/security-architecture.md)'s existing MinIO TLS
reasoning (§17 of that document) applied to Redis.

### 4. Network isolation and firewall requirements

Redis is **never** exposed to the public internet, in any environment — private network/VPC only,
with firewall/security-group rules restricting inbound connections to exactly the known
network identity of `apps/web` and the worker deployment
([`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §2). No direct human access to
production Redis over the open internet; manual inspection goes through a bastion/VPN/SSH tunnel.
This is the same principle
[`storage-architecture.md`](../../.claude/storage-architecture.md) §7 already applies to the
object storage origin — the pattern is not new to this ADR, only extended to a component that
previously had no equivalent statement at all.

### 5. Separation of Redis responsibilities

Three tiers, defined by sensitivity **and**, independently, by a genuine operational conflict
(§10) that would exist even absent any security concern at all — two separate justifications
pointing at the same design, which is a stronger basis for the decision than either alone:

| Tier | Workloads | Sensitivity | Eviction posture needed |
|---|---|---|---|
| **A — Security-critical** | Session cache, revocation blocklist, rate limiting | High — directly gates authentication/abuse-prevention | Must never silently evict (§10) |
| **B — Operational** | BullMQ queues, distributed locks, idempotency dedup, realtime Pub/Sub | Medium — carries business data and, transiently, sensitive fields (§6–§8) | Must never silently evict (§10) |
| **C — Cache** | General read-through cache of already-public data ([`backend-architecture.md`](../../.claude/backend-architecture.md) §8 point 1) | Low — losing it costs a Postgres round trip, nothing more | Designed to be evicted (§10) |

**Stage 1 deployment: a minimum of two physical Redis instances**, not one, and not the maximum
possible granularity either — `azhl-redis-critical` (Tiers A+B together) and `azhl-redis-cache`
(Tier C alone). Two instances, not seven, is a deliberately modest Stage 1 target: Tiers A and B
share fate for now because they share the same eviction requirement (§10) and are both
already-necessary infrastructure on day one; Tier C is split out immediately because its opposite
eviction requirement makes sharing an instance with A/B a **correctness** conflict (a single
Redis instance has exactly one `maxmemory-policy`), not merely a security nicety. Further splitting
Tier A from Tier B is real future work (§17), justified once operational load on one genuinely
threatens the other's latency — not done speculatively now.

### 6. Sensitive data stored in Redis

Stated explicitly, per workload, rather than left implicit:

- **Tier A:** session identifiers (not full session content — the session row itself stays in
  Postgres per [`security-architecture.md`](../../.claude/security-architecture.md) §7), JWT `jti`
  values (not secrets, but security *state* — their presence/absence *is* the revocation decision),
  rate-limit keys (IP addresses, user IDs — PII-adjacent, low sensitivity, still enumerated here
  rather than assumed).
- **Tier B:** BullMQ job payloads, which may include, per
  [`event-catalog.md`](../../.claude/event-catalog.md)'s `user.password_reset_requested` →
  Notification pipeline, a password-reset token (§7 below addresses this specifically), full
  outbound email/notification content, and — per
  [ADR-001](./ADR-001-inter-module-trust.md) §3/[ADR-002](./ADR-002-event-bus-trust.md) §5 — signed
  Internal Principal Tokens and Provenance Claims in transit (§16 addresses why their presence here
  is lower-risk than it first appears).
- **Tier C:** public data only, by definition (§5) — nothing in this tier is treated as sensitive.

### 7. Password-reset tokens: should they be stored in Redis at all?

**Minimized, not eliminated — the async job-queue architecture makes some transit through Redis
unavoidable, so the design's job is to shrink the exposure, not pretend it away.**

The reset token's *primary* record is a hash (never the raw value) in
`identity.verification_tokens` ([`database-erd.md`](../../.claude/database-erd.md) §4) — the same
hash-not-plaintext pattern already required for refresh tokens. Because only the hash is
persisted, and the *recipient's email* must contain a working link with the *raw* token, the raw
value necessarily exists somewhere between mint time (Identity) and send time (Notifications) —
and per [`backend-architecture.md`](../../.claude/backend-architecture.md) rule 3, that hop is an
asynchronous event → job transition, not a synchronous call, so it genuinely does cross Redis.

Given that transit is unavoidable, three concrete mitigations shrink its risk, rather than one
mitigation pretending to eliminate it:

1. **Field-level encryption of the token specifically**, not the whole job payload — see §8.
2. **Minimal dwell time**: this queue already carries the `Strict` retry policy
   ([`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §4), and is additionally
   configured with `removeOnComplete: true` so the job record (and its encrypted token field) is
   deleted from Redis immediately on successful send, not retained for inspection/debugging the way
   a lower-sensitivity job's completed record might be.
3. **The token's own short expiry** (already implied by
   [`database-erd.md`](../../.claude/database-erd.md)'s `verification_tokens.expires_at`) bounds
   the value even if it were somehow read from Redis during its brief dwell window.

### 8. BullMQ payload security

- **Prefer references over embedded secrets.** A job payload should carry the minimum needed for
  the worker to look up authoritative data itself (via the owning module's public interface, per
  [ADR-001](./ADR-001-inter-module-trust.md) rule 2) rather than embedding sensitive data directly
  — most jobs in [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md)'s catalog already
  fit this shape naturally (an `assetId`, a `gameId`).
- **Where a payload must carry a genuine secret** (§7's reset token being the clearest case), that
  specific field — not the whole payload — is encrypted with a **fourth, dedicated key domain: the
  Job Payload Encryption Key (JPEK)**, distinct from
  [`security-architecture.md`](../../.claude/security-architecture.md) §1's external access-token
  key, [ADR-001](./ADR-001-inter-module-trust.md) §3's Internal Principal Token key, and
  [ADR-002](./ADR-002-event-bus-trust.md) §5's Event Provenance Key. This fourth domain exists
  because it answers a genuinely different cryptographic question than the other three: those all
  provide **authenticity** (signing — proving who said something); JPEK provides
  **confidentiality** (encryption — hiding what was said). A signed-but-unencrypted payload is
  still fully readable by anything with Redis access; only encryption addresses that, and only the
  fields that actually need it should pay its cost.
- **Never logged in decrypted form** — restated from
  [`observability-architecture.md`](../../.claude/observability-architecture.md) §2's existing
  "never log a secret" rule, extended explicitly to cover job-payload processing logs specifically,
  since a queue worker's own logging is exactly the kind of code path that could otherwise
  accidentally dump a decrypted payload for debugging convenience.

### 9. Persistence and backup security

Persistence posture follows §5's tiers, not a single platform-wide setting:

- **`azhl-redis-cache` (Tier C): persistence disabled entirely.** Nothing in this tier is a
  primary record of anything — it's rebuildable from Postgres on a cache miss by definition, so
  there is no data-loss reason to persist it, and disabling persistence removes any at-rest
  footprint for this tier's data.
- **`azhl-redis-critical`, Tier A workloads (session/revocation/rate-limit):** minimal or disabled
  persistence — sessions are already a cache in front of Postgres
  ([`security-architecture.md`](../../.claude/security-architecture.md) §7's existing design), so
  losing this data on restart means re-validating from the real source of truth, not losing data
  that existed nowhere else.
- **`azhl-redis-critical`, Tier B workloads (BullMQ):** AOF persistence enabled — an in-flight job
  *is* the primary record of pending work; losing it on restart means losing real work, unlike
  Tier A. The resulting AOF file inherits whatever field-level encryption (§8) already protects a
  sensitive job field, and the underlying storage volume uses the hosting provider's disk
  encryption at rest — the same expectation already stated for
  [`storage-architecture.md`](../../.claude/storage-architecture.md) §9's backup exports.
- **Any Redis backup taken of `azhl-redis-critical`'s AOF/RDB files** follows the identical
  security posture as [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §11's
  database backup design: encrypted, access-restricted, not retained indefinitely, periodically
  verified — not a separate policy invented here.

### 10. Memory limits and eviction policies

`maxmemory` is set explicitly on every Redis deployment — never left unbounded, which risks an
OOM-killed process (an availability failure affecting every tier sharing that instance) rather than
a contained, controllable condition.

- **`azhl-redis-critical`: `noeviction`.** Under memory pressure, writes fail loudly (Redis returns
  an error) rather than silently dropping a key. This is a deliberate, security-motivated choice,
  not a default left unexamined: silently evicting a revocation-blocklist entry under memory
  pressure would mean a token believed revoked becomes usable again — a silent security
  regression, worse by far than a loud write failure that pages someone (§14). The same reasoning
  applies to rate-limit counters (silent eviction = a silent abuse-prevention bypass) and to
  BullMQ's own keys (BullMQ's own operational documentation already recommends against eviction
  policies that could remove its keys — this ADR's choice agrees with, rather than overrides,
  that upstream guidance).
- **`azhl-redis-cache`: `allkeys-lru`.** The opposite policy, correctly, because this tier's data
  is designed to be evictable — that is the entire purpose of a cache. This is precisely the
  operational conflict §5 uses to justify splitting instances at Stage 1 rather than deferring the
  split to a "later hardening pass": these two policies cannot coexist on one instance.

### 11. Availability and failure behavior

- **`azhl-redis-critical` is deployed with replication and automatic failover** (Redis Sentinel, or
  a managed provider's equivalent) — a single-node deployment for session/revocation/queue
  processing is itself an availability risk this design does not accept, given how much depends on
  it.
- **`azhl-redis-cache` may run single-node** — losing it costs a burst of Postgres load from cache
  misses, not a functional break, matching its designed-to-be-disposable nature (§5, §9).
- **This ADR specifies Redis's own availability posture — it does not decide the application-level
  fail-open/fail-closed question for the revocation check**, which
  [security review finding H-2](../security/09-security-architecture-review.md#h-2-fail-openfail-closed-behavior-of-the-token-revocation-check-is-unspecified)
  already identified as open and which the requester of this ADR explicitly scoped out ("do not
  address High/Medium findings yet"). What this ADR does establish, as a general orientation
  consistent with [`security-architecture.md`](../../.claude/security-architecture.md)'s stated
  fail-closed philosophy: a security-relevant check's *default* posture should favor fail-closed
  unless a specific, documented reason argues otherwise — H-2 is where that specific decision for
  the revocation check gets made, not here.

### 12. What happens if Redis is compromised

Two very different blast radii, corresponding directly to §5's tiers — stated with the same
honesty [ADR-001](./ADR-001-inter-module-trust.md) §9 and [ADR-002](./ADR-002-event-bus-trust.md)
§11 already apply to their own domains:

- **`azhl-redis-cache` compromised:** low impact. Only already-public data is exposed or
  tamperable; worst case is serving stale or incorrect *public* information (an integrity concern,
  not a confidentiality one) until the cache is flushed and rebuilt from Postgres.
- **`azhl-redis-critical` compromised:** high impact, but bounded by design, not unbounded. An
  attacker could: read session identifiers (mitigated by Postgres remaining the actual session
  source of truth, allowing mass revocation as an incident response); read or tamper with
  revocation-blocklist entries (potentially "un-revoking" a token by deleting its entry — the
  single most concerning capability this compromise grants); manipulate rate-limit counters to
  bypass throttling; and read BullMQ job payloads, **but only the fields not already protected by
  §8's field-level encryption**, and — critically, per §16 — **cannot forge new Internal Principal
  Tokens or Provenance Claims**, only observe genuine ones already in flight within their own short
  validity window.
- **Documented incident-response trigger** (a runbook, not implemented by this ADR but required to
  exist before this design goes live): on suspected `azhl-redis-critical` compromise — mass-revoke
  all sessions and refresh tokens (already a real capability per
  [`security-architecture.md`](../../.claude/security-architecture.md) §2's reuse-detection
  design), rotate every Redis ACL credential, rotate JPEK, and review
  [`analytics.audit_logs`](../../.claude/database-erd.md#11-analytics-schema) for activity during
  the suspected compromise window.

### 13. Secret/key management and rotation

Redis ACL credentials, TLS certificates, and the new JPEK are not a separate policy — they join the
existing rotation regime [`security-architecture.md`](../../.claude/security-architecture.md) §15
already specifies (scheduled rotation, immediate rotation on suspected compromise, no redeploy
required to rotate). One Redis-specific operational note this ADR adds: **ACL password rotation
requires a brief dual-credential window** (`ACL SETUSER` supports a user having two valid passwords
simultaneously) — the new credential is added, every application instance is rolled to it, and only
then is the old credential removed — since Redis has no separate grace-period mechanism the way
some other systems do, and a naive single-step swap would drop connections mid-rollout.

### 14. Logging and monitoring of Redis security events

Extends [`observability-architecture.md`](../../.claude/observability-architecture.md)'s existing
alerting tiers (§10 of that document) with Redis-specific triggers:

- **Page-tier:** any ACL violation (a client attempting a command or key pattern outside its ACL
  user's grant) — Redis logs these natively, and an occurrence is a strong signal of either a bug
  or an active compromise attempt, never expected in normal operation; a write failure on
  `azhl-redis-critical` due to `maxmemory` under `noeviction` (§10) — this is the loud failure that
  policy is specifically designed to produce, and it must actually reach a human, not just a log
  line; repeated failed AUTH attempts (brute-force indicator).
- **Never use the `MONITOR` command in production.** It's a debugging tool that streams every
  command Redis processes, including key values — left running, or invoked casually during an
  incident, it is itself a significant information-disclosure risk. Stated here as an explicit,
  permanent operational rule, not a one-time reminder.

### 15. How this changes between local development, staging, and production

| | Local development | Staging | Production |
|---|---|---|---|
| Instances | 1 (docker-compose), both tiers logically separated by ACL/prefix within it, for simplicity | 2, mirroring production | 2 (minimum), per §5 |
| Auth | ACL, required | ACL, required | ACL, required |
| TLS | Not required (loopback/compose-internal only) | Required | Required |
| Network isolation | N/A (local) | Private network, mirrors prod | Private network, firewalled |
| Persistence/eviction | Mirrors tier design for realism, relaxed rigor acceptable | Full production posture | Full production posture (§9, §10) |
| HA | None needed | Present if affordable, not required | Required for `azhl-redis-critical` (§11) |

Staging deliberately mirrors production's *security* posture as closely as practical (ACLs, TLS,
network isolation) even where its *availability* posture can be lighter (no HA required) — the
point of staging is catching a Redis-security misconfiguration before it reaches production, which
only works if staging is a genuine analog of production's trust boundaries, not a weaker
approximation of them.

### 16. Interaction with ADR-001 and ADR-002

Redis hardening and the two prior ADRs' signing-based designs are **complementary layers, not
overlapping ones** — worth stating precisely, since §6/§12 note that Redis carries IPT and
Provenance Claim data in transit, which could otherwise read as a contradiction of those ADRs'
own guarantees:

- [ADR-001](./ADR-001-inter-module-trust.md)'s in-process Principal propagation
  (`AsyncLocalStorage`) never touches Redis at all — it is pure in-process memory. Redis becomes
  relevant to ADR-001 only at its own cross-process boundary (the Internal Principal Token), which
  is exactly where ADR-001 already applies cryptographic signing *independent of* whatever hardens
  Redis itself.
- Because both the Internal Principal Token (ADR-001) and the Provenance Claim (ADR-002) are
  **signed, not merely stored as trusted data**, a worst-case `azhl-redis-critical` compromise
  (§12) lets an attacker *read* genuine in-flight tokens but **cannot forge new ones** — forgery
  requires the private signing key, which is never stored in Redis, only held by the composition
  root. This ADR's contribution is narrowing that residual "read a genuine token during its short
  validity window" risk (via network isolation, ACLs, and — for the one case that needs it,
  §7/§8's JPEK — encryption) rather than needing to re-derive unforgeability, which
  [ADR-001](./ADR-001-inter-module-trust.md)/[ADR-002](./ADR-002-event-bus-trust.md) already
  provide.
- Put differently: **signing (ADR-001/002) protects authenticity even if Redis is compromised;
  this ADR protects confidentiality and availability, which signing alone does not.** The three
  documents together, not any one alone, are what "Redis is hardened" actually means for this
  platform.

### 17. Future migration/scaling considerations

- **Redis Cluster (sharding)** once a single instance's capacity is exceeded — the ACL/key-prefix
  design (§2) is cluster-compatible without modification; BullMQ's own hash-tag key conventions
  already handle the atomicity its Lua scripts need within one shard.
- **Managed provider migration** (self-hosted → a managed Redis service) — this design is
  deliberately provider-agnostic (ACLs, TLS, and network isolation are standard Redis 6+/hosting
  capabilities, not tied to a specific vendor), consistent with the adapter-pattern philosophy
  applied everywhere else in this design series (Storage, Event Bus, Logger).
- **Splitting Tier A from Tier B** (§5) is the next reasonable step once BullMQ's operational load
  (e.g. a video-transcoding backlog, per
  [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §7) risks impacting
  session/revocation-check latency — a reliability-driven trigger, independent of any new security
  finding.
- **Read replicas for `azhl-redis-cache`** once read volume justifies it. Deliberately **not**
  recommended for `azhl-redis-critical`'s Tier A workloads — a stale read of revocation state from
  a lagging replica is a security bug, not a performance optimization, so that tier stays
  primary-only even after replicas exist elsewhere.

### 18. Required security and regression tests

- **ACL enforcement test:** every application component's Redis client, when it attempts a command
  or key pattern outside its assigned ACL user's grant, is rejected by Redis itself — an
  integration test against a real Redis instance, not a mocked assumption.
- **TLS enforcement test:** a plaintext connection attempt to a staging/production-configured Redis
  endpoint is refused.
- **Eviction-policy test:** filling `azhl-redis-critical` to its `maxmemory` limit causes write
  failures (not silent evictions), and that failure is observable by §14's monitoring.
- **Field-encryption test:** the raw value of a password-reset token (or any other JPEK-protected
  field) is never present in plaintext in Redis at any point during a job's queued lifetime —
  verified by inspecting the raw stored value, not just trusting the encryption call was made.
- **Cache-resilience test:** flushing or disconnecting `azhl-redis-cache` entirely does not break
  any read path — every cached read has a working, correctness-preserving Postgres fallback.
- **Credential-rotation test:** rolling an ACL password via the dual-credential procedure (§13)
  completes with zero dropped connections/failed requests during a simulated rolling deploy.
- **Config-lint fitness function (CI):** fails the build if any environment's Redis connection
  configuration omits ACL authentication, or (for any non-local environment) omits TLS — a static
  check catching a misconfiguration before it ever reaches a deploy.

---

## Consequences

### Security properties gained

- No single Redis compromise defeats every security control simultaneously — the tiering in §5
  means a `azhl-redis-cache` compromise is low-impact by design, and even a worst-case
  `azhl-redis-critical` compromise is bounded (§12) rather than total.
- Least-privilege is enforced per workload (§2), not assumed from a single shared credential —
  a compromised or buggy component can only affect the keys/commands its own ACL user was ever
  granted.
- The specific, previously-unaddressed question of password-reset tokens in transit (§7) now has a
  concrete answer: minimized exposure via field-level encryption, short dwell time, and short
  token expiry, rather than an unexamined assumption that "it's just in a job queue."
- Security-relevant state (revocation, rate limits) can no longer be silently lost to memory
  pressure (§10) — a failure mode becomes a loud, alertable event instead of an invisible
  regression.
- The design is explicit about what it does and does not protect against Redis compromise (§16) —
  authenticity (already covered by ADR-001/002's signing) versus confidentiality/availability
  (this ADR's actual contribution) — avoiding both overclaiming and underclaiming what hardening
  Redis actually buys.

### Tradeoffs

- **Two Redis instances at Stage 1, not one** — more infrastructure to provision and monitor than
  the status quo, justified by both a security argument (§5's tiering) and an independent
  correctness argument (§10's eviction-policy conflict), which together make this a harder
  tradeoff to defer than a security concern alone might have been.
- **A fourth key domain (JPEK)** to provision and rotate, alongside the external access-token key,
  IPT, and EPK — more operational surface, accepted for the same reason ADR-002 accepted a third:
  it protects a genuinely different property (confidentiality) that the others don't.
- **BullMQ's ACL scoping requires per-script-hash allowances**, not a simple command list — more
  setup effort than a blanket `+eval`, but the correct way to keep least-privilege for a library
  that legitimately needs Lua scripting for its atomic operations.
- **Local development now requires the same ACL structure as production** — a small setup cost for
  every developer, accepted because the alternative (a weaker local posture) is exactly what lets
  ACL-related bugs go unnoticed until staging or later.
- **This ADR does not resolve H-2** (fail-open/fail-closed for the revocation check specifically)
  — explicitly out of scope per the request, and flagged here so it isn't mistaken for solved.

### Alternatives considered

- **One Redis instance, logically separated by key prefix alone, no ACLs.** Rejected: key-prefix
  naming without ACL enforcement is a documentation convention, not a technical control — exactly
  the class of gap C-3 identified in the first place, just moved one layer down.
- **One Redis instance, ACL-separated, single shared eviction policy.** Rejected: §10's conflict
  between Tier A/B's `noeviction` need and Tier C's `allkeys-lru` need cannot be resolved within
  one instance's single `maxmemory-policy` setting — this isn't a security preference, it's a
  configuration impossibility.
- **Encrypt every BullMQ job payload wholesale, not just specific sensitive fields.** Rejected as
  unnecessary cost for most jobs, which carry no secret at all (an `assetId`, a `gameId`) —
  field-level encryption (§8) targets the actual risk without taxing every job in the system for
  the sensitivity of a small minority.
- **Defer all Redis hardening to Stage 3, when each module (and its Redis usage) is physically
  separated anyway.** Rejected for the same reason ADR-001/002 rejected deferring C-1/C-2: C-3 is
  exploitable today, and [`roadmap.md`](../../.claude/roadmap.md)'s phasing means "today" could
  span years before Stage 3 arrives.

---

## Related documents

- Remediates: [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md) — finding C-3
- Builds on: [ADR-001: Inter-Module Trust Model](./ADR-001-inter-module-trust.md), [ADR-002: Event Bus Trust Model](./ADR-002-event-bus-trust.md)
- Extends: [`backend-architecture.md`](../../.claude/backend-architecture.md) §8
- Extends: [`security-architecture.md`](../../.claude/security-architecture.md) §1, §6, §7, §15
- Extends: [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §2, §8
- Cross-references backup/at-rest posture in: [`storage-architecture.md`](../../.claude/storage-architecture.md) §9
- Extends alerting in: [`observability-architecture.md`](../../.claude/observability-architecture.md) §10
