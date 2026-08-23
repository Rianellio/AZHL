# ADR-002: Event Bus Trust Model — Enforced Publisher Identity & Provenance

- **Status:** Accepted (design). Not yet implemented — no application code exists for this
  decision yet; see [Consequences](#consequences) for implementation prerequisites.
- **Date:** 2026-07-30
- **Deciders:** Chief Architect, Security Engineer, Backend Engineer (per
  [`.claude/ai-workflow.md`](../../.claude/ai-workflow.md) routing)
- **Supersedes:** The unauthenticated `publish`/`subscribe` shape in
  [`backend-architecture.md`](../../.claude/backend-architecture.md) §4–§5, which this ADR extends
  with an enforceable publisher-identity and provenance model.
- **Builds on:** [ADR-001: Inter-Module Trust Model](./ADR-001-inter-module-trust.md) — this
  document assumes ADR-001's Principal/capability mechanism as given and extends the same
  underlying pattern to a second, distinct identity: not "which user," but "which module."
- **Remediates:** Finding **C-2** in
  [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)

---

## Context

[`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)
finding C-2 identified that the `EventBus` interface
(`publish<T>(event: DomainEvent<T>): Promise<void>`,
`subscribe<T>(eventType, handler)` — [`backend-architecture.md`](../../.claude/backend-architecture.md)
§4) has no concept of *who* is allowed to publish *which* event type, at either Stage 1
(`InMemoryEventBus`) or the planned Stage 3 (`KafkaEventBus`). Any module holding a reference to
the bus can publish any event, including identity-sensitive ones —
[`event-catalog.md`](../../.claude/event-catalog.md) §10 already names `notification.requested` as
a "command dressed as event" with real side effects; every event in that catalog deserves the same
scrutiny, and none currently has any publisher-identity verification at all. Combined with C-1
(now remediated by ADR-001), this meant a compromised module didn't even need to forge a direct
call — it could publish a fraudulent `user.roles_changed` or `game.finished` and let the system's
own trust in event provenance do the rest.

This decision must:
- Preserve the Modular Monolith architecture exactly as designed — no change to which modules
  exist, what they own, or the "publish/subscribe, never a direct call" communication rule itself
  ([`backend-architecture.md`](../../.claude/backend-architecture.md) §3 rule 3).
- Provide technical enforcement, not a convention.
- Work today, at Stage 1, not only once Kafka exists.
- Compose cleanly with ADR-001 rather than duplicating or contradicting it.

---

## Decision

Introduce two distinct, unforgeable identity concepts and gate every `publish()` call on both: a
**Module Publisher Identity** (which software component is asserting this event happened — always
a module, never a user), verified structurally in-process the same way ADR-001 verifies a user
Principal; and a **Provenance Claim** (a signed attestation of that identity), used wherever an
event or event-derived data crosses a process boundary. Authorization data (which module may
publish which event type) is not invented here — it already exists as
[`event-catalog.md`](../../.claude/event-catalog.md)'s "Producer" column for all 35 cataloged
events; this ADR makes that column enforced, not merely documented.

### 1. Module/event publisher identities

Each business module ([`backend-architecture.md`](../../.claude/backend-architecture.md) §2 —
Identity, Competition, Game Operations, Statistics, Content, Media, Notifications, Analytics,
Commerce) has a fixed, closed-set `ModuleId`. A module never *asserts* its own `ModuleId` when
publishing — it never has the opportunity to. At process bootstrap, the composition root (the
single file already responsible, per
[`backend-architecture.md`](../../.claude/backend-architecture.md) §5, for choosing which
`EventBus` implementation is active) constructs one **bound publisher** per module — a closure
that has that module's true `ModuleId` baked in at construction time — and hands each module
*only its own* bound publisher, never the raw underlying `publish()` function. A module calling
`publish(eventType, payload)` on its bound publisher cannot set `source` to anything but its own
identity, because `source` is not a parameter of that call at all; it's fixed at wiring time by
code the module doesn't control. This is the same structural principle ADR-001 §4 uses for
`AuthContext` — remove the parameter a caller could lie about, rather than validating a value they
supply.

### 2. Which modules are allowed to publish which events

An explicit allow-list, `EVENT_PUBLISHER_ALLOWLIST: Record<EventType, ModuleId[]>`, derived
directly from [`event-catalog.md`](../../.claude/event-catalog.md)'s existing per-event "Producer"
field (§4–§10 of that document) — this ADR does not invent new authorization data, it takes data
that already exists and makes it load-bearing. Most events map to exactly one producer module
(`game.finished` → Game Operations only). `notification.requested` is the one event in the catalog
already specified as publishable by *multiple* modules ("any module wanting a user notified...
never Notifications itself," per [`event-catalog.md`](../../.claude/event-catalog.md) §3/§10) — the
allow-list's value type is a list specifically to represent this correctly, not as a general
escape hatch.

### 3. Preventing unauthorized modules from publishing privileged events

The bound-publisher pattern (§1) proves genuine identity; this section is the second, independent
gate: even with proven identity, a module must still be *allowed* to publish the specific event
type it's attempting. `packages/platform/event-bus`'s internal `publish()` implementation — not
any module's code — checks `EVENT_PUBLISHER_ALLOWLIST[eventType].includes(callerModuleId)` before
delivering to any subscriber, and **throws** (fail-closed, matching
[ADR-001](./ADR-001-inter-module-trust.md)'s and
[`security-architecture.md`](../../.claude/security-architecture.md)'s existing fail-closed
principle) rather than silently dropping the event if the check fails. This single choke point —
checked once, at publish, by platform code no module can bypass — is what lets every downstream
consumer trust `source` without re-verifying it themselves (§4).

### 4. Preventing consumers from trusting forged provenance

Because §1 makes `source` unforgeable and §3 gates every publish on an allow-list check the module
cannot skip, **an event that successfully reaches any subscriber has already had its provenance
verified** — a consumer never needs its own separate check of "did this really come from Game
Operations," the same way, under ADR-001, a module never needs to independently re-verify a
Principal it reads via `requirePrincipal()`. Verification happens once, at the boundary the data
crosses, not once per consumer — this is deliberate: N independent per-consumer checks would be
N chances to get the check wrong or forget it; one checkpoint that nothing can bypass is a smaller,
more auditable surface.

### 5. How provenance is represented and verified

Two representations, matched to whether the event stays in one process or not — mirroring
[ADR-001](./ADR-001-inter-module-trust.md) §3's exact same split:

- **In-process (Stage 1's actual event flow in full):** provenance is reference/structural —
  `source` was set by a closure the module never controlled, and delivery already passed the §3
  gate. No cryptography involved or needed; the guarantee is as strong as JavaScript's closure and
  module-privacy semantics, at effectively zero runtime cost.
- **Crossing a process boundary** (a BullMQ job enqueued as a reaction to an event — the *only*
  way an event's effects leave the single Stage-1 process today, per §7 below; a Kafka message at
  Stage 3, §8): the event is accompanied by a **Provenance Claim** —
  `{ eventId, eventType, sourceModule, issuedAt, expiresAt, payloadHash, signature }` — signed with
  a **dedicated Event Provenance Key (EPK)**, a *third* key domain alongside
  [`security-architecture.md`](../../.claude/security-architecture.md) §1's external access-token
  key and [ADR-001](./ADR-001-inter-module-trust.md) §3's Internal Principal Token key. Three
  separate domains, not one reused key, so a compromise of any one (an external mobile token
  signing key; a key attesting "who the acting user is"; a key attesting "which module published
  this") does not cascade into the other two — each answers a genuinely different question about
  a genuinely different subject. `payloadHash` is a hash of the event's canonical serialized
  payload, not just its metadata — so tampering with a payload's *content* (e.g. a score field)
  after signing, not just its claimed source, is independently detectable.

### 6. How this works for in-process events

1. At process bootstrap, the composition root constructs the active `EventBus` implementation
   (§5's in-process case for Stage 1) and, for each module, a bound publisher (§1) plus its
   subscriptions.
2. A module calls its own bound `publish(eventType, payload)`. The closure supplies `source`; the
   platform's `publish()` implementation checks §3's allow-list; on success, `subscribe()`
   handlers registered for that event type are invoked (via `queueMicrotask`, per
   [`backend-architecture.md`](../../.claude/backend-architecture.md) §5, unchanged by this ADR).
3. Every handler that receives the event trusts `source` outright (§4) — no additional
   verification step is written into consumer code, keeping
   [`event-catalog.md`](../../.claude/event-catalog.md)'s existing per-event consumer logic
   unchanged by this decision.
4. If a handler needs to act with privilege (a Postgres write), it does so via
   [ADR-001](./ADR-001-inter-module-trust.md) §6's `definePrivilegedOperation()` — see §9 below for
   which Principal an event handler runs under.

### 7. How BullMQ jobs are authenticated and authorized

The instant an event's effects need to survive past the in-process handler — a module enqueuing a
BullMQ job ([`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §1) — two things must
travel with that job, answering two different questions:

- **Who is this being done on behalf of** — [ADR-001](./ADR-001-inter-module-trust.md) §3's
  `mintPropagationToken()` output (Internal Principal Token), if a human/system actor context
  exists for this operation.
- **What triggered this, and is that trigger genuine** — this ADR's Provenance Claim (§5), proving
  the job was enqueued as a legitimate reaction to a real, correctly-authorized event, not
  fabricated by a compromised process with Redis access.

Additionally, **enqueue itself is capability-gated the same way publish is**: a module receives a
bound `enqueue()` function (from the same composition root as §1's bound publisher) scoped only to
the queue(s) it owns, per
[`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §3's existing "every queue is
owned by exactly one module" rule — previously a convention, now the same structural
mechanism as §1: a module is never handed a generic `enqueue(queueName, payload)` capable of
targeting any queue, only a pre-scoped one. (This also closes
[finding L-4](../security/09-security-architecture-review.md#l-4-no-queue-level-access-control-for-bullmq-enqueue-operations)
from the security review as a direct consequence of applying this ADR's own mechanism
consistently, not as separate work.)

The worker, on picking up a job, verifies the Provenance Claim's signature (and, if present, the
IPT) **before** invoking the job handler — a job whose claim fails verification is routed straight
to that queue's dead-letter queue
([`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §5) with a distinct failure
reason ("provenance verification failed"), never silently processed and never silently dropped.

### 8. Evolution to Kafka at Stage 3 without a new model

The same relationship [ADR-001](./ADR-001-inter-module-trust.md) §8 establishes for Principal
propagation holds again here, deliberately: **the cross-process path (§5's signed Provenance
Claim) is not new infrastructure built for Kafka — it already exists at Stage 1**, because BullMQ
jobs already needed it (§7). At Stage 3:

- `EVENT_PUBLISHER_ALLOWLIST` (§2) becomes Kafka's native per-principal, per-topic ACL
  configuration — each extracted service authenticates to the Kafka cluster with its own
  credentials (mTLS client certificate or SASL credential, one per service), and the broker
  enforces the identical allow-list data this ADR already specifies, just at a different
  enforcement point (broker-side instead of in-process gate).
- The Provenance Claim, already attached to every event that crosses a process boundary since
  Stage 1, is attached to *every* event once Kafka is the transport (because every event now
  crosses a process boundary) — carried as a Kafka message header, alongside the W3C Trace Context
  header [`observability-architecture.md`](../../.claude/observability-architecture.md) §13 already
  plans to put there. Consumers verify it independently of the broker's own ACL enforcement — Kafka
  ACLs stop an unauthorized *producer*; the signature lets every individual *consumer* verify
  authenticity itself too, a genuine defense-in-depth property (broker-level and consumer-level
  checks, not just one), consistent with
  [`security-architecture.md`](../../.claude/security-architecture.md)'s Security by Design
  "verify explicitly" framing.
- No new key infrastructure, no new signature scheme, no new authorization data model — Stage 3
  uses the same EPK and the same allow-list Stage 1 already has, more often, not differently.

### 9. Interaction with the C-1 Principal/capability model

ADR-001 and this ADR answer two different questions about two different kinds of subject, and are
designed to compose rather than overlap:

- **ADR-001's Principal** answers "which user or system actor is this operation being performed on
  behalf of."
- **This ADR's Module Publisher Identity** answers "which software module is asserting this event
  happened" — never a user, always exactly one of the fixed module identities from
  [`backend-architecture.md`](../../.claude/backend-architecture.md) §2.

The connection point is **event handler execution context**: when a subscriber's handler runs in
reaction to an event, it is not "inside" the original HTTP request's `AsyncLocalStorage` scope (the
request that originally triggered the event may have already completed and returned a response by
the time an async handler runs). The handler instead runs under a **`"system"`-kind Principal**
([ADR-001](./ADR-001-inter-module-trust.md) §1 already defines this Principal category for
scheduled/background work; this ADR is its second, equally load-bearing use), minted per
*subscribing* module at composition-root wiring time, carrying only the permissions that module's
event handlers legitimately need (Statistics' event-handler Principal can write standings; it
cannot manage user roles) — least-privilege applied to event consumption the same way it's already
applied to scheduled jobs. A handler that needs to perform a privileged write still goes through
[ADR-001](./ADR-001-inter-module-trust.md) §6's `definePrivilegedOperation()`, using this
`"system"` Principal exactly as any other code path would use whatever Principal is ambient.

### 10. Replay protection and event integrity

- **In-process:** not a distinct threat — there is no captured artifact to replay; a function call
  either happens once or it doesn't happen.
- **Cross-process (BullMQ jobs today; Kafka at Stage 3):** two independent layers, not one:
  1. **Idempotency**, already fully designed in
     [`event-catalog.md`](../../.claude/event-catalog.md) §2.4 — every consumer dedups on
     `DomainEvent.id` before acting. This ADR does not redesign that; it notes that idempotency
     dedup is itself a replay defense as a side effect, reused rather than duplicated.
  2. **Bounded validity.** Every Provenance Claim (and, retroactively applying the same reasoning
     to [ADR-001](./ADR-001-inter-module-trust.md) §3's Internal Principal Token, which did not
     previously specify an expiry) carries a short `issuedAt`/`expiresAt` window (minutes, not
     hours) — narrower than idempotency dedup alone, because dedup only protects against *replaying
     the exact same event ID*; a short expiry additionally bounds how long a captured, valid
     signature remains usable at all if it were somehow exfiltrated from a queue/broker before
     idempotency dedup ever had a chance to apply.
  3. `payloadHash` (§5) makes tampering with a claim's *content* — not just replaying it unmodified
     — independently detectable, closing the gap between "this signature is valid" and "this
     payload is what was actually signed."

### 11. What happens if a module is compromised

Stated with the same honesty as [ADR-001](./ADR-001-inter-module-trust.md) §9, because the limits
are genuinely analogous:

- **A compromised module attempting to publish an event it is not authorized to publish, or to
  forge another module's provenance**, is exactly what this ADR defeats — it has no bound publisher
  for an event type outside its own allow-list entry (§2/§3), and cannot construct one, because the
  binding happened once, at bootstrap, by code it does not control.
- **A compromised module publishing false-but-authorized content** — e.g. a compromised Game
  Operations publishing a genuine, correctly-attributed `game.finished` event with a fabricated
  score — is **not** solved by this ADR, and this ADR does not claim to solve it. Provenance
  authenticity (who published this) and content truthfulness (is this data actually correct) are
  different properties; this ADR only establishes the first. Defending against the second is a
  business-logic/data-validation concern (e.g. Statistics sanity-checking a `game.finished`
  payload's score delta against `game_operations.game_events` before trusting it wholesale,
  [`database-erd.md`](../../.claude/database-erd.md) §6) — flagged here as a distinct, real
  consideration for whoever implements Statistics' event handler, not addressed further in this
  document.
- As with ADR-001, this remains a single-process limitation at Stage 1 — full isolation between
  modules' blast radii is Stage 3's job, which this ADR's design explicitly anticipates (§8) rather
  than defers indefinitely.

### 12. Required regression tests and architectural enforcement

- **Module-boundary fitness function:** no package may import the raw/unbound `publish()`/
  `enqueue()` implementation from `packages/platform/event-bus`/`packages/platform/queue` — only
  the composition root constructs bound instances, verified the same way
  [ADR-001](./ADR-001-inter-module-trust.md) §10 verifies `security-context`'s import boundary
  (Node `exports`-map restriction, checked in CI).
- **Unit test: allow-list enforcement.** A module's bound publisher, asked to publish an event type
  not in its `EVENT_PUBLISHER_ALLOWLIST` entry, throws — never silently succeeds, never silently
  drops.
- **Unit test: unforgeable source.** For every successfully published event across the full test
  suite, `event.source` equals the true identity of the module whose bound publisher was called —
  asserted as a suite-wide invariant, not a single test case.
- **Confused-deputy test:** Module A attempts to publish an event type owned by Module B — fails to
  compile (A's bound publisher has no method/overload for that event type) or throws at runtime for
  any dynamic path.
- **Signature/tamper test:** flipping one byte of a Provenance Claim's `payloadHash` or `signature`
  before a worker/consumer verifies it causes verification failure, routing to the DLQ per §7.
- **Replay/expiry test:** a Provenance Claim presented after its `expiresAt` is rejected even if its
  signature is otherwise valid and even if idempotency dedup would not have caught it.
- **Integration test: full round trip.** An event published by one module, consumed via a BullMQ
  job by another, arrives at the worker with `source`, `eventId`, and payload all verifiably intact
  — proving §5–§7's handoff end to end, the direct analog of
  [ADR-001](./ADR-001-inter-module-trust.md) §10's cross-process Principal round-trip test.

---

## Consequences

### Security properties gained

- No module can publish an event type outside its own authorized set, and no module can cause an
  event to appear to originate from a different module — both are structurally prevented, not
  merely checked.
- Every consumer of every event can trust `source` without independently re-verifying it, because
  verification happens once, at a single choke point neither the publisher nor any consumer
  controls.
- Cross-process event effects (BullMQ jobs today, Kafka at Stage 3) carry cryptographically
  verifiable provenance, using a key domain independent of both external authentication and
  internal user-Principal propagation — a compromise of one does not cascade to the others.
- The same mechanism serves Stage 1 and Stage 3 without redesign, and gains a genuine
  defense-in-depth property at Stage 3 (broker ACLs *and* per-consumer signature verification,
  not one or the other).
- [Finding L-4](../security/09-security-architecture-review.md#l-4-no-queue-level-access-control-for-bullmq-enqueue-operations)
  is closed as a direct consequence, not separate work.

### Tradeoffs

- **New required infrastructure before any module publishes or subscribes to anything**: the
  composition root's bound-publisher/bound-enqueue wiring, `EVENT_PUBLISHER_ALLOWLIST`, and the EPK
  key pair must exist before the first event flow is implemented — a prerequisite, not an optional
  later hardening pass, matching how the request explicitly scoped this to design only.
- **A third key domain to provision and rotate** (alongside the external access-token key and
  ADR-001's IPT key) — more operational surface than a single shared key, accepted deliberately for
  the blast-radius-isolation property it buys (§5).
- **`EVENT_PUBLISHER_ALLOWLIST` is a new artifact that must stay in sync with
  [`event-catalog.md`](../../.claude/event-catalog.md)'s Producer column** — a new event added to
  the catalog without a corresponding allow-list entry fails closed (publish throws), which is the
  correct default but does mean the catalog and the allow-list are two places describing one fact;
  recommended mitigation at implementation time is generating the allow-list from the catalog
  document (or a shared source both are derived from) rather than hand-maintaining both.
- **Does not address content-truthfulness of authorized events** (§11) — stated as an explicit,
  honest limit, not implied to be solved.

### Alternatives considered

- **Per-event HMAC signed by every publisher, verified in-process by every consumer, universally**
  (i.e. treat every in-process event the same as a cross-process one). Rejected for the same reason
  [ADR-001](./ADR-001-inter-module-trust.md) rejected universal in-process signing: no additional
  security property over closure-based unforgeability within one memory space, at real CPU cost on
  every single in-process publish.
- **A central "event gateway" module that all publishes must route through explicitly (an extra
  function call per publish, rather than a bound closure).** Rejected: functionally similar, but
  requires every module to remember to call it correctly (a convention again, just one level
  removed) rather than making the correct behavior the *only* behavior a module's bound publisher
  can exhibit.
- **Trust Kafka's broker-side ACLs alone at Stage 3, skip consumer-side signature verification.**
  Rejected: broker ACLs alone protect against unauthorized *production*, not against a compromised
  broker, a misconfigured ACL, or a message tampered with in transit before consumption — matches
  this platform's stated "verify explicitly" Security by Design principle
  ([`security-architecture.md`](../../.claude/security-architecture.md)) rather than trusting a
  single infrastructure layer implicitly.
- **Defer publisher authorization entirely until Stage 3, when Kafka ACLs exist natively.**
  Rejected for the same reason ADR-001 rejected deferring C-1 to Stage 3: C-2 is exploitable today,
  at Stage 1, and [`roadmap.md`](../../.claude/roadmap.md)'s phasing means "today" could span years.

---

## Related documents

- Remediates: [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md) — finding C-2
- Builds on: [ADR-001: Inter-Module Trust Model](./ADR-001-inter-module-trust.md)
- Extends: [`backend-architecture.md`](../../.claude/backend-architecture.md) §4–§5
- Enforces (previously descriptive-only) data from: [`event-catalog.md`](../../.claude/event-catalog.md) (Producer column, all sections)
- Extends queue ownership in: [`bullmq-architecture.md`](../../.claude/bullmq-architecture.md) §1, §3, §7
- Reuses transport/header propagation planned in: [`observability-architecture.md`](../../.claude/observability-architecture.md) §13
