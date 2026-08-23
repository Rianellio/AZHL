# AZHL Platform — Security Architecture (Design Only)

**Status: design document only.** No auth middleware, hashing call, header config, or storage
policy described here is implemented. This document is the security-focused deep dive that ties
together and extends what [backend-architecture.md](./backend-architecture.md) (§11 Authentication,
§12 RBAC, §16 Security), [database-erd.md](./database-erd.md) (§4 `identity` schema),
[api-specification.md](./api-specification.md) (§2 Authentication endpoints), and
[event-catalog.md](./event-catalog.md) (Identity events, §12 audit filtering) already decided —
none of that is re-derived or contradicted here, only gone into deeper on the topics those
documents named but didn't fully specify. Nothing here is authorized to build ahead of its
feature's phase in [roadmap.md](./roadmap.md).

Primary owner: **Security Engineer** agent.

---

## Table of contents

1. [JWT](#1-jwt)
2. [Refresh tokens](#2-refresh-tokens)
3. [RBAC](#3-rbac)
4. [Permissions](#4-permissions)
5. [API security](#5-api-security)
6. [Rate limiting](#6-rate-limiting)
7. [Redis sessions](#7-redis-sessions)
8. [Password hashing](#8-password-hashing)
9. [2FA](#9-2fa)
10. [CSRF](#10-csrf)
11. [CORS](#11-cors)
12. [XSS](#12-xss)
13. [SQL injection](#13-sql-injection)
14. [Audit logging](#14-audit-logging)
15. [Secret management](#15-secret-management)
16. [Environment variables](#16-environment-variables)
17. [MinIO security](#17-minio-security)
18. [File upload security](#18-file-upload-security)
19. [Future: OAuth](#19-future-oauth)
20. [Future: SSO](#20-future-sso)
21. [Future: API keys](#21-future-api-keys)
22. [Future: mobile authentication](#22-future-mobile-authentication)

---

## 1. JWT

Used **only** for the mobile app / public API token flow
([backend-architecture.md](./backend-architecture.md) §11) — never for the browser, which uses
Auth.js's own cookie session (§7). Conflating the two would mean reinventing session revocation
badly; keeping them separate means each does the thing it's actually good at.

- **Algorithm: RS256 (asymmetric), not HS256.** A symmetric secret (HS256) would have to be shared
  with every service that needs to *verify* a token, which is fine for one monolith but becomes a
  real liability the moment a module is extracted per
  [backend-architecture.md](./backend-architecture.md) §5 — every extracted service would hold a
  secret capable of *forging* tokens, not just checking them. RS256 means only Identity holds the
  private signing key; every other module/service verifies with the public key alone, which is
  safe to distribute widely.
- **Claims:** `sub` (userId), `roles` (current role names, embedded so most requests don't need a
  DB round-trip to authorize — see §3's staleness caveat), `iat`, `exp`, `jti` (a unique token ID,
  used for the revocation-check described below).
- **Lifetime:** short — 15 minutes. An access token is meant to be cheap to mint and cheap to
  throw away; anything long-lived belongs in the refresh token, not here.
- **Revocation:** a JWT can't be "deleted" the way a session row can — it's valid until `exp` no
  matter what. Given the short lifetime above, this is usually an acceptable window for routine
  staleness, but not for a deliberate, known-urgent change. Two complementary mechanisms, per
  [ADR-004: H-1 Remediation](../../docs/adr/ADR-004-H-1-remediation.md) §3 (which also corrects a
  data-structure inconsistency in this section's prior wording — a Redis `SET` cannot carry a
  per-member TTL, so individual revocations use individual keys, not shared-set membership):
  - **Individual revocation** — `revocation:jti:{jti}`, one key per revoked token, `EXPIRE` set to
    that token's own remaining lifetime, for explicit single-device logout and
    [ADR-001](../../docs/adr/ADR-001-inter-module-trust.md) §2's refresh-token reuse detection,
    where a specific token is known at revocation time.
  - **Broad, per-user revocation** — `revocation:not-before:{userId}`, checked against the token's
    `iat` on every request, for `user.roles_changed`/`user.deactivated`
    ([ADR-004](../../docs/adr/ADR-004-H-1-remediation.md) §3.2), where no specific `jti` is known
    at revocation time — this is the mechanism the deactivation/role-change case actually needs; a
    jti-blocklist alone cannot express "every currently-outstanding token for this user."

  Both keyspaces live in `azhl-redis-critical`'s Tier A, under the dedicated `azhl-revocation` ACL
  user, with a `noeviction` policy specifically so neither can be silently dropped under memory
  pressure — see [ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md)
  §2/§10, which treats an evicted revocation entry as a security regression, not an acceptable
  cache miss.

---

## 2. Refresh tokens

Fully schema-designed already in [database-erd.md](./database-erd.md) §4
(`identity.refresh_tokens` — hashed storage, `revoked_at`, one row per device). This section adds
the *behavioral* policy on top of that shape.

- **Rotation on every use.** Each call to `POST /v1/auth/refresh`
  ([api-specification.md](./api-specification.md) §2) issues a **new** refresh token and
  immediately revokes the one just used — a refresh token is single-use, not a standing credential
  reusable indefinitely.
- **Reuse detection.** If a refresh token that's already been revoked (per rotation, above) is
  presented again, that's a strong signal it was stolen and used by two parties — respond by
  revoking **every** refresh token for that user (all devices), not just the one presented, and
  publish `notification.requested` (topic: security alert) so the user is told to re-authenticate
  everywhere. This is the single highest-value refresh-token security behavior worth implementing
  correctly, more than any specific expiry duration.
- **Device-scoped, not account-scoped.** One row per device/session (already the schema's shape),
  so "log out this device" (mobile settings UX) revokes exactly one row, not the user's entire
  session footprint.
- **Lifetime:** long (30–90 days) but sliding — rotation (above) naturally extends it on active
  use; a device that goes untouched for the full window expires and requires a fresh login, not
  a silent indefinite renewal.

---

## 3. RBAC

Already the subject of [backend-architecture.md](./backend-architecture.md) §12 and
[database-erd.md](./database-erd.md)'s `roles`/`user_roles` tables — this section adds the
operational details those left open.

- **Enforcement point: middleware, never business logic** — restated from
  [backend-architecture.md](./backend-architecture.md) §12 because it's the single most important
  RBAC rule and worth repeating in a security-specific document: a module's function assumes it's
  already authorized to run. This assumption is only trustworthy because the identity/role data a
  module reads is technically unforgeable, not merely conventionally trusted — see
  [ADR-001](../../docs/adr/ADR-001-inter-module-trust.md), which remediates
  [security review finding C-1](../../docs/security/09-security-architecture-review.md#c-1-in-process-module-calls-carry-no-verifiable-authorization-context)
  (a module could otherwise fabricate its own elevated context and call another module directly).
- **Claim staleness.** §1's JWT embeds `roles` at mint time, but a database-session (web) always
  reads current roles from Postgres/Redis (§7) on each request — no staleness window for the
  browser path, confirmed correct by [ADR-004](../../docs/adr/ADR-004-H-1-remediation.md)'s review
  (§7's session-cache invalidation already lists role change as a trigger; this was not a gap).
  For the mobile/API path, `user.roles_changed`/`user.deactivated` no longer leave a
  window at all — [ADR-004: H-1 Remediation](../../docs/adr/ADR-004-H-1-remediation.md)
  synchronously revokes every outstanding access token for the affected user as part of the same
  operation that changes their role, closing what was previously described here as "an accepted
  tradeoff" of up to 15 minutes of stale elevated access. Design accepted; implementation and
  regression tests are still required before this is actually true in a running system.
- **`ADMIN` is not a bypass hatch sprinkled through code** — every privileged action still names
  the specific permission it requires (§4); `ADMIN` simply holds all of them, per
  [backend-architecture.md](./backend-architecture.md) §12's table. This keeps a future partial-admin
  role (e.g. a moderator with everything except `user:manage-roles`) a one-line permission-set
  change, not a code change.

---

## 4. Permissions

- **Naming convention:** `resource:action` (`content:publish`, `media:upload`, `roster:write`,
  `user:manage-roles`), already established in
  [backend-architecture.md](./backend-architecture.md) §12 — restated here because permission
  strings are as much a security artifact as a data model one; a typo'd permission string that
  silently never matches anything is a security bug (a check that always fails closed is safe;
  one that's misspelled on both the check *and* the grant side and happens to match is an accident,
  not a design).
- **Additive by default, same discipline as API versioning**
  ([api-specification.md](./api-specification.md) §1.1): adding a new permission string is always
  safe; *removing* one from a role that's currently relied on is the kind of change that needs the
  same care as a breaking API change — audit who currently exercises it (via `audit_logs`, §14)
  before removing.
- **No resource-instance-level permissions in Phase 1's design** — permissions are checked at the
  *type* level ("can this user publish news at all") plus the `Self`/ownership check
  ([api-specification.md](./api-specification.md) §1.3) for "is this specifically their own
  resource." A finer per-instance ACL system (e.g. "this editor can only edit *this* team's news")
  is real future scalability territory, deliberately not designed now since nothing in the current
  product shape needs it — adding it later is a `permissions`/`role_permissions` schema extension,
  not a redesign.

---

## 5. API security

- **TLS everywhere**, terminated at the hosting platform's edge (Vercel) — no endpoint, public or
  authenticated, is ever served over plain HTTP in any real environment.
- **Security headers** on every response: `Strict-Transport-Security` (force HTTPS on repeat
  visits), `X-Content-Type-Options: nosniff` (stop a browser from re-interpreting a JSON response
  as something executable), `Content-Security-Policy` (§12), `Referrer-Policy: strict-origin-when-cross-origin`.
- **Input validation at the boundary**, per
  [backend-architecture.md](./backend-architecture.md) §15 — every request body/query param is
  Zod-validated before a module ever sees it; a validation failure is a `400`/`422`
  ([api-specification.md](./api-specification.md) §1.7), never a stack trace.
- **Request size limits** on every body-accepting endpoint, tightest on `/v1/media/upload-url`'s
  metadata request (the file itself never transits this API at all — §18) and on any future
  free-text field, to blunt a trivial resource-exhaustion attempt.
- **Method allow-listing** — a route only implements the HTTP methods
  [api-specification.md](./api-specification.md) documents for it; anything else is a `405`, not a
  silently-permissive catch-all.
- **No verbose error detail ever crosses the API boundary** — restated from
  [api-guidelines.md](./api-guidelines.md): a Prisma error, a stack trace, or an internal exception
  message never appears in `ApiError.details`. This is a security property as much as an API
  hygiene one — internal error text routinely leaks schema/implementation details useful to an
  attacker.

---

## 6. Rate limiting

Extends [backend-architecture.md](./backend-architecture.md) §8/§16's Redis sliding-window limiter
with concrete tiering:

| Endpoint class | Example | Limit posture |
|---|---|---|
| Auth — credential-guessing surface | `POST /v1/auth/login` | Strictest — a handful of attempts per IP *and* per account per minute, whichever is hit first, to blunt both distributed and targeted brute force |
| Auth — abuse-prone but not guessable | `POST /v1/auth/register`, `/v1/auth/verify-email`, `password_reset_requested` | Strict, per-IP and per-email, to stop signup spam and reset-email flooding of a real user |
| Authenticated writes | `POST/PATCH/DELETE` under `Role: EDITOR+`/`ADMIN` | Moderate, per-user — these callers are identified and accountable (§14), so limits exist to blunt automation/bugs, not malice specifically |
| Public reads | `GET /v1/teams`, `/v1/standings`, etc. | Generous, per-IP — the goal is protecting shared capacity from a runaway client, not gatekeeping legitimate traffic |
| Third-party API key (Future) | any `API Key`-level call | Per-key, tier-configurable — a paid/trusted key gets a higher ceiling than a free one, enforced at the same middleware layer, not a separate system |

A limited request always returns `429 RATE_LIMITED` with a `Retry-After` header — never a silent
drop, so a well-behaved client can back off correctly instead of hammering a wall. Rate-limit
counters live in `azhl-redis-critical`'s Tier A, under the `azhl-ratelimit` ACL user, with the same
`noeviction` reasoning as §1's revocation `SET` — a silently-evicted counter is a silent
abuse-prevention bypass, per
[ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md) §5/§10.

---

## 7. Redis sessions

Auth.js's session strategy ([architecture.md](./architecture.md)) can be database-backed (Postgres,
via `identity.sessions`, [database-erd.md](./database-erd.md)) or JWT-backed. This platform's
production posture: **Postgres remains the source of truth; Redis sits in front of it as a
read-through cache**, not a replacement — the same "Redis for cross-instance shared state, Postgres
for durability" split [backend-architecture.md](./backend-architecture.md) §8 already draws for
caching generally. The session cache lives in `azhl-redis-critical`'s Tier A, under the
`azhl-session` ACL user — its full hardening (authentication, TLS, network isolation, eviction
posture) is specified in
[ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md), which this
section's design assumes rather than re-derives.

- **Why not pure JWT sessions for the browser:** a JWT session can't be revoked early without the
  same `jti`-blocklist machinery §1 already needs for mobile — and the browser path has no
  bandwidth-cost reason to avoid a DB lookup the way a mobile client does, so there's no real
  upside to giving up instant revocation for it.
- **Why not pure Postgres, no cache:** at scale, a session check on *every* request hitting
  Postgres directly is exactly the kind of avoidable load
  [backend-architecture.md](./backend-architecture.md) §8 already flags Redis for.
- **Shape:** session data cached in Redis keyed by session token, TTL matching the session's own
  expiry (Redis expires it natively — no separate cleanup job needed for the cache layer, unlike
  the underlying Postgres `sessions` table which still needs the scheduled purge
  [database-erd.md](./database-erd.md) already notes). A write (login, logout, role change) updates
  Postgres first, then invalidates/updates the Redis entry — Postgres is never allowed to disagree
  with the cache for longer than one write's round trip.
- **Instant revocation property:** deleting a Redis session key (on logout, on `user.deactivated`,
  on suspected compromise) takes effect on the *next* request, unlike a JWT which remains valid
  until `exp` — this is the concrete advantage a cookie-session + Redis-cache design has over pure
  JWT for the browser, and the reason the two auth mechanisms (§1 vs. this section) are
  deliberately not unified into one.

---

## 8. Password hashing

- **Argon2id**, not bcrypt — the Password Hashing Competition winner, memory-hard (expensive to
  parallelize on GPU/ASIC hardware, unlike bcrypt), and the current OWASP-recommended default.
  Concrete starting parameters (tune at implementation time against real server hardware, these are
  a floor not a ceiling): memory cost ≥ 19 MiB, iterations ≥ 2, parallelism ≥ 1, per OWASP's
  minimum guidance — re-benchmark whenever the hosting hardware changes.
- **Salt:** automatic and unique per password, handled internally by Argon2id — never a
  hand-rolled or shared salt.
- **Pepper (defense in depth, optional but recommended):** an additional secret, held only in
  environment configuration (§16), mixed into the hash input alongside the per-password salt. A
  stolen *database* dump alone is insufficient to crack any password without also having
  compromised the *application's* secret store — a meaningfully higher bar than a DB leak alone.
- **Never log, never include in any event payload or audit log detail** — `user.password_changed`
  (§Identity events, [event-catalog.md](./event-catalog.md)) carries only `userId`/`changedAt`,
  never the hash, by design already stated there and restated here as a hard security invariant,
  not just a modeling choice.

---

## 9. 2FA

- **TOTP (RFC 6238)** as the primary second factor — compatible with any standard authenticator
  app (Google Authenticator, 1Password, Authy), no SMS provider dependency, and avoids SMS 2FA's
  well-documented weaknesses (SIM-swap, SS7 interception) entirely by not using SMS at all.
- **Backup/recovery codes:** a set of one-time-use codes generated at 2FA enrollment, hashed at
  rest exactly like a password (§8) — not a special case. Consumed one at a time for account
  recovery if the authenticator device is lost; regenerating the set invalidates all previous codes.
- **Risk-based enforcement, not a blanket requirement:** optional for `FAN` (a read-mostly account
  with no write power over league content), strongly recommended for `EDITOR`, and required for
  `ADMIN` — proportional to what a compromised account of that role could actually do, per
  [backend-architecture.md](./backend-architecture.md) §12's permission model.
- **Future upgrade path: WebAuthn/passkeys.** Stronger than TOTP (phishing-resistant, no shared
  secret to steal), and Auth.js has first-class support for it — worth adopting as the recommended
  method once the platform's user base and the underlying library support are both ready, with
  TOTP remaining as a fallback for devices/browsers without passkey support.

---

## 10. CSRF

Only relevant to the **cookie-authenticated browser path** — a mobile/API client presenting a
Bearer token (§1) has no ambient credential a malicious page could ride along on, so CSRF simply
does not apply to that path at all; worth stating plainly so it isn't over-engineered where it
doesn't apply.

- **First line of defense: `SameSite=Lax` (or `Strict` where compatible with the login flow) on
  the session cookie** — blocks the cookie from being sent on most cross-site requests before a
  CSRF token is even checked.
- **Second line: synchronizer token pattern for every state-changing browser-originated request**
  (`POST`/`PATCH`/`DELETE` under a cookie session) — Auth.js provides this for its own routes
  natively; the custom `v1` write endpoints
  ([api-specification.md](./api-specification.md)) adopt the same token, issued with the session
  and required in a header (not just a hidden form field, since this is a JSON API) on every
  mutating request.
- **Defense in depth, not either/or** — `SameSite` alone is strong but not infallible across every
  browser/embedding edge case; the token check costs little and closes that gap.

---

## 11. CORS

- **`apps/web`'s own `v1` routes: no CORS needed** — same-origin calls only, restated from
  [backend-architecture.md](./backend-architecture.md) §16.
- **Future public API, authenticated/credentialed endpoints:** an explicit per-API-key registered
  origin allowlist — **never** a wildcard `*` on any endpoint that reads a cookie or accepts
  credentials, without exception.
- **Future public API, `Public`-level read-only `GET` endpoints**
  ([api-specification.md](./api-specification.md) §1.3): a wildcard origin is acceptable *here
  specifically* — these endpoints require no credential and expose nothing sensitive by definition
  (that's what `Public` means), so there's no cross-origin secret to protect. Drawing this
  distinction explicitly avoids both mistakes: blanket-wildcard CORS (unsafe for anything
  authenticated) and blanket-locked-down CORS (breaks the entire point of a public API for
  read-only consumers).

---

## 12. XSS

- **The framework's default behavior is the first and strongest line of defense** — JSX
  auto-escapes all rendered text; the platform simply never manually opts out of that for
  user/editor-supplied content today.
- **The one real risk surface: rich-text news article bodies**, if/when editorial content supports
  HTML rather than plain text — anywhere `dangerouslySetInnerHTML` (or equivalent) is used, the
  HTML must be sanitized against an explicit allow-list of safe tags/attributes (a library like
  `sanitize-html`/DOMPurify) **on write** (when an editor saves the article), not just trusted
  because the author holds the `EDITOR` role — a compromised editor account, or a compromised
  editor's browser extension, is exactly the scenario this defends against, and "we trust
  editors" is not a substitute for sanitization.
- **`Content-Security-Policy` as a second, independent layer**
  (§5): `script-src 'self'` (no inline scripts, no `eval`), so even a sanitization bug doesn't
  automatically become a working script-injection — CSP and input sanitization are complementary,
  not redundant.

---

## 13. SQL injection

- **Prisma's query builder parameterizes every query by construction** — the entire existing
  codebase already never hand-writes SQL, and this design's services-are-the-only-DB-access rule
  ([architecture.md](./architecture.md), [backend-architecture.md](./backend-architecture.md) §3)
  means there's exactly one place per module this could ever go wrong, not scattered across route
  handlers.
- **The one rule for any future `$queryRaw`/`$executeRaw` use** (a complex reporting query
  Prisma's builder can't express cleanly, for instance): **always** Prisma's tagged-template
  parameterization, **never** manual string concatenation of a value into SQL text, no exceptions
  for "it's just an internal admin query" — an internal-only query is still a query, and "internal"
  is not a security boundary.

---

## 14. Audit logging

Fully schema-designed in [database-erd.md](./database-erd.md) §11 and behaviorally specified in
[event-catalog.md](./event-catalog.md) §12 (which events produce a row, which don't, and why) —
this section adds the security framing on top:

- **Audit logging is a *detective* control, not a *preventive* one** — it doesn't stop a bad
  action, it makes sure a bad action is discoverable and attributable after the fact. RBAC (§3),
  rate limiting (§6), and input validation (§5) are the preventive controls; audit logs are what a
  Security Engineer reaches for during an investigation once something's already happened.
- **Immutable and admin-only**, deliberately not soft-deletable
  ([database-erd.md](./database-erd.md) §11 already made this call) — a security control that
  could itself be tampered with by the access level it's meant to hold accountable isn't a control.
- **Retention** is a compliance/legal question as much as a technical one, deferred to whenever the
  platform has a real requirement to answer it against (data residency, how long a dispute could
  reasonably look back) — not fixed arbitrarily in this design.

---

## 15. Secret management

- **Never committed, ever** — restated as a hard rule from
  [future-services.md](./future-services.md): `.env.example` documents variable *names* only; real
  values live exclusively in the hosting platform's secret store (Vercel today).
- **Least-privilege scoping per module**, already designed in
  [backend-architecture.md](./backend-architecture.md) §6/§16 — a module's DB credential can only
  reach its own Postgres schema; the same principle applies to every other secret a module holds
  (its slice of a third-party API key, its own signing key where applicable) — no module holds a
  secret it doesn't need.
- **Rotation policy:** JWT signing keys, DB credentials, third-party API keys, and — per
  [ADR-003: Redis Security Architecture](../../docs/adr/ADR-003-redis-security.md) §13 — every
  Redis ACL credential and the Job Payload Encryption Key (JPEK) join the identical schedule
  (concretely: at minimum annually, or immediately on any suspected compromise) — and, critically,
  the rotation *mechanism* is designed to require no full redeploy (secrets read at boot from the
  platform's store, not baked into a build artifact), so rotating a secret is an operational
  action, not a release. Redis ACL credentials specifically use a brief dual-credential window
  during rotation (ADR-003 §13), since Redis has no separate grace-period mechanism of its own.
- **Evolution path beyond plain env vars:** once rotation needs to happen *without* a redeploy at
  all (a live key-rotation event, for instance), or once the number of secrets/environments grows
  past what a flat env-var list manages comfortably, a dedicated secrets manager (Vercel's own
  encrypted env storage today; AWS Secrets Manager/HashiCorp Vault if infrastructure ever moves
  beyond Vercel) is the natural next step — not a redesign, an upgrade of *where* the same env-var
  contract's values are sourced from.

---

## 16. Environment variables

- **Documented, not stored** — `.env.example` lists every variable name any module/app needs, with
  a placeholder value, so a new environment can be provisioned by reading one file, never by
  reverse-engineering which vars matter from code.
- **Scoped per environment** (Development / Preview / Production), never shared across apps' own
  Vercel projects even where a name matches — already established in
  [future-services.md](./future-services.md).
- **Validated at process boot**, per [backend-architecture.md](./backend-architecture.md) §15 — a
  missing or malformed required variable fails startup loudly, immediately, rather than surfacing
  as a mysterious runtime error the first time that code path executes in production.

---

## 17. MinIO security

MinIO (S3-API-compatible object storage) is recommended here specifically as the **local
development / self-hosted-parity** counterpart to the Cloudinary adapter already decided in
[future-services.md](./future-services.md) and formalized as the `MediaStorage` interface in
[backend-architecture.md](./backend-architecture.md) §7 — added to `docker-compose.yml` alongside
the existing local Postgres, so a developer can build/test Media features without holding real
Cloudinary credentials. It implements the same `MediaStorage` interface; nothing about the Media
module's own code needs to know which adapter is active. If a future requirement ever makes a
self-hosted object store the *production* choice instead of Cloudinary (data residency, cost at
scale), the same security posture below applies there too, not just in local dev.

- **Never use the root/admin credential for application access.** MinIO's root user is for
  cluster administration only; the application connects with a dedicated access key scoped to a
  specific bucket and a minimal policy (read/write objects, no bucket-management rights).
- **Buckets are private by default** — no public-read bucket policy, ever. Any access a browser
  needs goes through a signed URL with a short expiry
  ([backend-architecture.md](./backend-architecture.md) §7's `getSignedUploadUrl`), the same
  pattern used for reads as for uploads.
- **TLS on MinIO's own endpoint**, even self-hosted and even in local development where it's
  easy to skip — mismatched behavior between a plain-HTTP local setup and a TLS production setup is
  exactly the kind of gap that hides a real bug until it's in front of real traffic.
- **Network isolation in production:** if MinIO is ever the production store, it sits on a private
  network reachable only by the backend that issues signed URLs — never exposed directly to the
  public internet, which would defeat the entire point of gating access through signed, expiring
  URLs.

---

## 18. File upload security

Extends the signed-direct-upload flow already designed in
[backend-architecture.md](./backend-architecture.md) §7 and
[api-specification.md](./api-specification.md) §10 (`/v1/media/upload-url`).

- **Content-type allow-listing at request time** — the upload-URL request declares a content type
  from a closed, explicit list (specific image/video MIME types only); anything else is rejected
  before a signed URL is ever issued, per the endpoint's existing `422` behavior.
- **Verify the actual file, not just the declared MIME type.** A client can claim any
  `Content-Type` it wants; before `POST /v1/media` finalizes an asset's metadata
  ([api-specification.md](./api-specification.md) §10), the Media module inspects the uploaded
  file's real signature (magic bytes), not just trusts the header — this is specifically what
  stops a `.html`/script file renamed with an image extension from being accepted and later served
  back as if it were safe media (a real, common file-upload attack, and a stored-XSS vector if the
  storage layer ever serves a file with its original/claimed content type).
- **File size limits**, enforced both client-side (fast feedback) and server-side (the only limit
  that actually matters for security) — sized per media type (images small, video larger but
  capped) to bound both storage cost and worst-case processing time for transcoding (§9,
  [backend-architecture.md](./backend-architecture.md)).
- **Never trust or reuse the original filename as a storage key** — every asset is stored under an
  opaque, server-generated ID (already implicit in the `assetId`-based design in
  [api-specification.md](./api-specification.md) §10), avoiding both path-traversal attempts
  embedded in a filename and any information leak a descriptive original filename might carry.
- **Strip metadata from images on ingest** — EXIF data (GPS coordinates, device info) is a real
  privacy leak for user-adjacent photo uploads; re-encode or explicitly strip EXIF as part of the
  same processing step that generates thumbnails, before an asset is ever served publicly.
- **Malware/virus scanning** — not needed for Phase 1's admin/editor-only upload path (a small,
  trusted, `Role: EDITOR+`-gated set of uploaders), but flagged now as a **required addition the
  moment any upload path becomes open to general fans/users** — a scanning step (ClamAV, or a
  cloud provider's scanning API) sitting between "uploaded" and "publicly served," not bolted on
  after the fact once user uploads already exist in production.

---

## 19. Future: OAuth

Already the *primary*, not just future, web authentication mechanism per
[architecture.md](./architecture.md)'s Auth.js decision — "future" here means "not yet configured
with a live provider," not "not yet designed."

- **Provider(s):** Google first (broadest reach for a general fan base); additional providers
  added the same way, since Auth.js's adapter model treats each as an
  `identity.accounts` row (already in [database-erd.md](./database-erd.md)) linked to one `users`
  row — adding a provider is configuration, not a schema change.
- **Trust the provider's verified-email flag, not just the email address it returns** — an OAuth
  provider's profile email must be checked as *provider-verified* before it's trusted to link to
  (or create) an AZHL account with that email; an unverified email from a provider is treated the
  same as an unverified local signup.
- **Account linking:** if a user signs up with email/password and later uses OAuth with the same
  (verified) email, link to the existing `users` row rather than silently creating a second
  account — a real, common edge case worth designing for explicitly rather than discovering as a
  support ticket.

---

## 20. Future: SSO

Scoped specifically to **league staff accessing `apps/admin`**, not fans — a fundamentally
different problem from consumer OAuth (§19), relevant once the organization itself has enough
staff for centralized identity (Google Workspace/Azure AD/Okta) to be worth the integration cost
rather than each staff member holding an individually-managed AZHL password.

- **SAML or OIDC**, whichever the league's chosen identity provider supports — implementation
  detail deferred to when this is actually prioritized, since it depends entirely on a
  not-yet-made organizational choice (which IdP the league itself standardizes on).
- **Layers on top of the existing Identity/RBAC model, not beside it** — an SSO-authenticated staff
  member still resolves to a normal `identity.users` row with normal `user_roles`
  ([database-erd.md](./database-erd.md)); SSO changes *how a session is established*, never *what
  authority a session carries*. This avoids ever building a second, parallel permissions system for
  "SSO users" that needs to be kept in sync with the primary one.

---

## 21. Future: API keys

Extends [api-specification.md](./api-specification.md)'s `API Key` auth level with concrete key
hygiene, once third-party public-API consumers are real.

- **Format:** a prefixed, environment-distinguishing key (`azhl_live_...` / `azhl_test_...`,
  the same convention Stripe popularized) — a key's prefix alone tells a developer (or an
  automated secret-scanner) which environment it belongs to without needing to look it up.
- **Storage:** hashed at rest, exactly like a password (§8) or refresh token (§2) — a leaked
  database dump must not hand out usable keys.
- **Scoping:** per-key rate limit tier (§6) and a read-only-vs-limited-write permission scope,
  checked by the same RBAC middleware (§3) every other auth level goes through — an API key maps to
  an `AuthContext` the same way a session or JWT does, not a separate authorization code path.
- **Revocation and rotation:** instantly revocable (delete the key's row/cache entry, same
  mechanism as §7's session revocation); the issuing dashboard (a Phase-4-`apps/admin`-adjacent
  feature) reminds a key holder of its age and encourages periodic rotation, the same operational
  discipline as §15's secret rotation, just self-service for external consumers instead of
  internal ops.

---

## 22. Future: mobile authentication

Ties together §1 (JWT) and §2 (refresh tokens) with mobile-specific concerns those sections don't
cover on their own.

- **Device-bound refresh tokens** (already the schema's shape, §2) directly enable a real "manage
  your devices" settings screen — list every active refresh token/session, revoke one
  individually, without affecting any other device.
- **Biometric unlock is a local convenience layer, not a server-side auth mechanism.** Face
  ID/fingerprint gates access to a refresh token already stored in the device's secure
  enclave/keystore — it decides *whether this device's owner may use the token right now*, and
  never replaces the server-side validation the token itself still goes through on every refresh.
- **Certificate pinning** (pinning the mobile app to AZHL's known API TLS certificate) is a
  worthwhile hardening step against man-in-the-middle interception on untrusted networks (public
  Wi-Fi) — flagged as a future hardening pass once the mobile app is real, not a Phase 1 concern
  for a web-only platform.
- **Deep-link/redirect safety:** if any future mobile OAuth flow opens a web view or system
  browser for a provider's login screen, the redirect back into the app must be validated against
  an explicit allow-listed URI scheme — an unvalidated redirect target in a mobile OAuth flow is a
  known, exploitable pattern for token interception.
