# ADR-004: H-1 Remediation — Immediate Revocation on Privilege Change

- **Status:** Accepted (design). Not yet implemented — no infrastructure or application code exists
  for this decision yet; see [Consequences](#consequences) for implementation prerequisites.
- **Date:** 2026-07-30
- **Deciders:** Chief Architect, Security Engineer, Backend Engineer (per
  [`.claude/ai-workflow.md`](../../.claude/ai-workflow.md) routing)
- **Corrects:** [`security-architecture.md`](../../.claude/security-architecture.md) §1's
  revocation mechanism, which this ADR shows is incomplete for the case it was already meant to
  cover, not only the case H-1 names.
- **Builds on:** [ADR-001](./ADR-001-inter-module-trust.md) (the revocation write is gated by the
  same permission check as the privileged operation that triggers it),
  [ADR-002](./ADR-002-event-bus-trust.md) (`user.roles_changed` remains a normal, unchanged
  event for every *other* consumer), [ADR-003](./ADR-003-redis-security.md) (the new key lives in
  the Redis trust tier that document already established).
- **Remediates:** Finding **H-1** in
  [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md)

---

## 1. The original finding

Quoting [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md#h-1-privilege-downgrade-does-not-revoke-already-issued-tokens)
in full, since this ADR's design depends on precisely what was and wasn't claimed:

> `security-architecture.md` §1 specifies JWT revocation via a Redis blocklist "for the specific
> case of `user.deactivated`/a forced logout." `user.roles_changed` is not listed as a trigger for
> that blocklist. A user demoted from `ADMIN` to `FAN`... retains a valid, `ADMIN`-scoped access
> token for up to its full remaining lifetime (15 minutes) after the demotion... **Required
> mitigation:** `user.roles_changed` must also write to the same revocation blocklist as
> `user.deactivated`.

---

## 2. Root cause — deeper than the finding states

The finding's suggested mitigation ("write to the same blocklist") does not actually work as
stated, and identifying *why* is this ADR's real contribution beyond restating H-1.

[`security-architecture.md`](../../.claude/security-architecture.md) §1's existing mechanism is a
**jti-blocklist**: a specific, individually-known token identifier is marked revoked. This works
for an explicit single-session logout, because the client presents the exact token being logged
out — its `jti` is known at the moment of revocation. It **cannot** express "revoke every
currently-outstanding token for user X," because Identity has no record of which `jti` values are
currently live for that user — a `jti` is generated at mint time and exists only inside the token
itself, on the client. There is nothing to add to a jti-blocklist for a user who isn't actively
presenting a token at the moment their role changes.

This means the gap is not "one missing trigger on an otherwise-complete mechanism" — **the jti-blocklist
mechanism is structurally the wrong tool for a broad, per-user revocation**, and this is equally
true of the *existing*, already-designed `user.deactivated` case, not only the
`user.roles_changed` case H-1 named. An admin deactivating a *different* user's account has the
identical problem: no known `jti` to blocklist. H-1's own literal fix, if implemented as written,
would not have closed the gap it identified.

A second, smaller technical inconsistency in the same passage: it describes "a Redis `SET` of
revoked `jti`s with a TTL matching the token's own remaining lifetime" — but a Redis `SET` applies
one TTL to the entire key, not per-member. Individually-expiring entries require individual keys,
not members of one shared set. Corrected in §3.

---

## 3. Proposed architecture

**Two complementary mechanisms, not one, each for the case it actually fits — both already
implied by the existing design's intent, made precise here:**

### 3.1 Individual revocation (corrects the existing mechanism, unchanged in purpose)

`revocation:jti:{jti}` — an individual Redis key per revoked token (not a shared `SET`), value
irrelevant, `EXPIRE` set to that specific token's own remaining lifetime (`exp - now()`) — so each
entry self-expires exactly when the token it revokes would have expired anyway, no cleanup job
needed. Used for explicit single-device logout and
[ADR-001](./ADR-001-inter-module-trust.md) §2/refresh-token-reuse-detection's targeted revocations
— cases where a specific token is known at the moment of revocation.

### 3.2 Broad, per-user revocation (the actual fix H-1 needs)

`revocation:not-before:{userId}` — one key per affected user, value = the timestamp the
revocation took effect, `EXPIRE` set to a fixed ceiling slightly longer than the access-token
lifetime (e.g. 20 minutes against a 15-minute token — a token issued before this key's creation
cannot possibly still be valid once that window has passed, so the key is safe to let expire and
never needs manual cleanup). On every authenticated request, after signature verification, the
access token is rejected if `token.iat < GET revocation:not-before:{token.sub}` — a stale token is
rejected outright, without Identity ever needing to have known its `jti`.

**Both checks run on every authenticated mobile/API request** — the individual jti check (§3.1,
unchanged) and the new not-before check (§3.2). They answer different questions ("was *this*
token revoked" vs. "was *every* token for this user invalidated as of some point in time") and
neither replaces the other.

### 3.3 Trigger: synchronous, not event-driven

The not-before write happens **inside Identity's own command handler for role changes and
deactivation, in the same operation as the Postgres write** — not as a reaction to consuming
`user.roles_changed` asynchronously off the Event Bus. This is a deliberate choice: revocation is
time-sensitive by definition; an async event-driven trigger (even Stage 1's near-instant
`queueMicrotask` dispatch, [`backend-architecture.md`](../../.claude/backend-architecture.md) §5)
introduces a window, however small, between "the role changed" and "the token is actually
revoked" — exactly the class of gap this ADR exists to close, not reintroduce one order of
magnitude smaller. `user.roles_changed` continues to publish, unchanged, for every *other*
consumer (Analytics' audit trail, Notifications) — this ADR does not touch the event itself, only
adds a synchronous side effect that happens before it.

Concretely: the privileged operation behind
[`api-specification.md`](../../.claude/api-specification.md) §3's `PUT /v1/users/{id}/roles` (and
the equivalent deactivation path) performs, in order: (1) update `identity.user_roles`/`users` in
Postgres, (2) write `revocation:not-before:{userId}`, (3) publish `user.roles_changed` /
`user.deactivated`. Steps 1–2 complete, and are confirmed, before the API call returns success to
the caller.

---

## 4. Interaction with C-1, C-2, and C-3

- **C-1 / [ADR-001](./ADR-001-inter-module-trust.md):** the role-change/deactivation handler is
  itself a privileged operation (`user:manage-roles`, per
  [`backend-architecture.md`](../../.claude/backend-architecture.md) §12's permission table),
  already required to go through `definePrivilegedOperation()`
  ([ADR-001](./ADR-001-inter-module-trust.md) §6). This ADR's not-before write happens *inside*
  that same guarded call — it is not a new, separately-reachable side channel, so it inherits
  ADR-001's authorization guarantee for free rather than needing its own.
- **C-2 / [ADR-002](./ADR-002-event-bus-trust.md):** unchanged. `user.roles_changed` still
  publishes through Identity's bound publisher exactly as ADR-002 designed; this ADR only adds a
  synchronous step that precedes that publish within the same handler, never altering the event
  itself, its allow-list entry, or its consumers.
- **C-3 / [ADR-003](./ADR-003-redis-security.md):** both `revocation:jti:*` and
  `revocation:not-before:*` live under the `revocation:*` prefix ADR-003 already assigned to the
  `azhl-revocation` ACL user, Tier A, `noeviction` policy, in `azhl-redis-critical`. **No change to
  ADR-003 is required** — this ADR's new key pattern fits the boundary that document already
  established; it's a new key shape within an already-hardened keyspace, not a new trust domain.

---

## 5. What genuinely required a design change, and why the rest didn't

Per this ADR's own instruction to preserve existing architecture unless a change is genuinely
necessary: the **only** new primitive introduced is §3.2's not-before mechanism, and it is
introduced because §2 shows the alternative (extending the existing jti-blocklist to cover
`user.roles_changed`) is not merely a smaller fix but **does not work at all** for a broad,
per-user revocation — this is the minimum change that actually closes the gap, not an elective
enhancement. Everything else — the event catalog, the Event Bus mechanism, the Redis trust tier,
the RBAC permission model, the RS256 token design itself — is unchanged.

---

## Consequences

### Security properties gained

- A role downgrade or account deactivation now invalidates every outstanding access token for that
  user **synchronously**, closing the up-to-15-minute elevated-access window H-1 identified.
- The same fix also closes a previously-unstated latent gap in the *existing* `user.deactivated`
  design (§2) — an admin deactivating another user's account now actually works as originally
  intended, not only the narrower case H-1 named.
- Individual, single-device revocation (explicit logout, reuse-detection) remains precise and
  unaffected — broad revocation and targeted revocation no longer share one mechanism that was
  only ever suited to the targeted case.

### Tradeoffs

- **One additional Redis read per authenticated request** (the not-before check), alongside the
  existing jti check — combinable into a single round trip via a Lua script/pipeline as an
  implementation-time optimization, but a real, non-zero addition regardless.
- **Any role change revokes, not only a downgrade.** Distinguishing "this change reduced privilege"
  from "this change only added privilege" would avoid an unnecessary forced token refresh on
  privilege *additions*, but requires comparing old and new permission sets correctly — a more
  complex, more bug-prone rule for a purely cosmetic UX gain (one extra refresh cycle) against a
  security property (simplicity that's easy to verify is correct). This ADR takes the simpler,
  unconditional rule deliberately.
- **A small, new, self-expiring keyspace** (`revocation:not-before:{userId}`) — bounded by user
  count, not token count, and self-cleaning via TTL (§3.2), so its growth is not a practical
  concern, but it is a new thing to monitor per
  [`observability-architecture.md`](../../.claude/observability-architecture.md)'s existing Redis
  alerting (extended, not redesigned, by [ADR-003](./ADR-003-redis-security.md) §14).

### Regression tests and CI requirements

- **Unit test — broad revocation works:** an access token issued *before* a `user.roles_changed`/
  `user.deactivated` operation is rejected on its very next use afterward, even though its
  specific `jti` was never individually blocklisted.
- **Unit test — fresh tokens are unaffected:** a token minted *after* the not-before timestamp
  (e.g. via a post-change refresh) is accepted and carries the new roles.
- **Unit test — mechanisms don't cross-contaminate:** an explicit single-device logout revokes
  only that one token (§3.1) and does not affect the user's other active sessions/devices; a
  broad revocation (§3.2) does not require or depend on any `jti` having been individually
  tracked.
- **Ordering/atomicity test:** the not-before write is confirmed complete before the triggering
  API call returns success — no window exists where Postgres reflects the new role but the
  not-before key hasn't been set.
- **Structural enforcement (fitness function):** every code path that writes to
  `identity.user_roles` or deactivates a user is required to go through one shared,
  composed operation (both the Postgres write and the not-before write bundled together, the same
  "make the correct path the only path" discipline [ADR-001](./ADR-001-inter-module-trust.md) §6
  already established for privileged operations generally) — a direct Postgres write to
  `user_roles` that bypasses this composed operation should be structurally unreachable from
  outside Identity's own command handler, not merely discouraged.
- **Latency regression test:** the combined per-request revocation check (jti + not-before) adds
  bounded, measured overhead to authenticated request latency, tracked as a named metric per
  [`observability-architecture.md`](../../.claude/observability-architecture.md) §12.

### Explicitly out of scope for this ADR

- **H-2** (fail-open/fail-closed behavior when Redis itself is unavailable) — untouched, per
  instruction. Worth noting precisely because this ADR adds a *second* Redis-dependent check
  (not-before) alongside the existing jti check: whatever H-2 eventually decides must cover
  **both** checks identically: it would be inconsistent, and would reopen exactly this ADR's own
  gap, for one check to fail closed and the other to fail open on the same underlying Redis
  outage.
- **Refresh-token revocation is not triggered by a role change** — only the *access* token is
  effectively invalidated (via not-before); the refresh token remains valid, and a subsequent
  refresh mints a new access token carrying the corrected roles automatically. Full refresh-token
  revocation stays reserved for suspected theft
  ([ADR-001](./ADR-001-inter-module-trust.md) §2's reuse detection) — a deliberate scope boundary,
  not an oversight, since forcing a full re-login on every routine role change would be
  disproportionate to the actual risk.
- **The browser/session path is not touched, because it does not need to be.** Re-reading
  [`security-architecture.md`](../../.claude/security-architecture.md) §7 confirms it already
  lists "role change" among the writes that invalidate the Redis session cache — this path was
  already correctly designed; H-1's gap was specific to the JWT/mobile mechanism in §1.
- No other High, Medium, or Low finding is addressed by this document.

---

## Related documents

- Remediates: [`docs/security/09-security-architecture-review.md`](../security/09-security-architecture-review.md) — finding H-1
- Builds on: [ADR-001](./ADR-001-inter-module-trust.md), [ADR-002](./ADR-002-event-bus-trust.md), [ADR-003](./ADR-003-redis-security.md)
- Corrects: [`security-architecture.md`](../../.claude/security-architecture.md) §1
- No changes required to: [`database-erd.md`](../../.claude/database-erd.md), [`event-catalog.md`](../../.claude/event-catalog.md), [`api-specification.md`](../../.claude/api-specification.md) (the role-change endpoint's contract is unchanged; only its internal implementation gains a required step)
